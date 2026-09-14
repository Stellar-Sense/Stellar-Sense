import copy
import json

import pytest
from sqlalchemy import func, select

from app.models import KnowledgeNode, User
from app.models.adaptive import LearnerState
from app.schemas.learner_profile import LearnerProfileWrite
from app.services.learner_profile import guidance_context

PROFILE = {
    "version": 1,
    "selections": {
        "backgrounds": ["gis"],
        "remoteSensing": ["practice"],
        "python": ["concepts"],
        "machineLearning": ["none"],
        "goals": ["intro"],
        "interests": ["imagery"],
        "styles": ["steps", "code"],
        "time": ["30"],
    },
}


@pytest.mark.asyncio
async def test_registration_requires_complete_valid_profile_and_saves_it_atomically(api):
    client, _, sessions = api
    payload = {"email": "new@example.test", "password": "test-password"}
    assert (await client.post("/api/auth/register", json=payload)).status_code == 422
    invalid = copy.deepcopy(PROFILE)
    invalid["selections"]["backgrounds"] = ["gis", "none"]
    assert (
        await client.post("/api/auth/register", json={**payload, "learnerProfile": invalid})
    ).status_code == 422
    async with sessions() as db:
        assert await db.scalar(select(User).where(User.email == payload["email"])) is None
    response = await client.post("/api/auth/register", json={**payload, "learnerProfile": PROFILE})
    assert response.status_code == 200, response.text
    auth = {"Authorization": f"Bearer {response.json()['accessToken']}"}
    assert (await client.get("/api/user/learner-profile", headers=auth)).json()["profile"] == PROFILE
    assert (
        await client.post("/api/auth/register", json={**payload, "learnerProfile": PROFILE})
    ).status_code == 409


@pytest.mark.asyncio
async def test_profile_edit_persists_isolated_and_invalid_edit_does_not_overwrite(api):
    client, headers, sessions = api
    assert (await client.get("/api/user/learner-profile")).status_code == 401
    assert (await client.get("/api/user/learner-profile", headers=headers[1])).json() == {"profile": None}
    assert (
        await client.put("/api/user/learner-profile", headers=headers[1], json=PROFILE)
    ).status_code == 200
    edited = copy.deepcopy(PROFILE)
    edited["selections"]["styles"] = ["examples"]
    await client.put("/api/user/learner-profile", headers=headers[1], json=edited)
    assert (await client.get("/api/user/learner-profile", headers=headers[1])).json()["profile"] == edited
    assert (await client.get("/api/user/learner-profile", headers=headers[2])).json()["profile"] is None
    for key, values in [("styles", ["injected-instruction"]), ("time", []), ("goals", ["intro"] * 3)]:
        invalid = copy.deepcopy(edited)
        invalid["selections"][key] = values
        response = await client.put("/api/user/learner-profile", headers=headers[1], json=invalid)
        assert response.status_code == 422
    assert (await client.get("/api/user/learner-profile", headers=headers[1])).json()["profile"] == edited
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(LearnerState)) == 0
        context = await guidance_context(db, 1, {"learner_profile": {"forged": True}, "node_id": "a"})
        assert context["learner_profile"]["讲解偏好"] == ["先用通俗例子解释"]
        assert "forged" not in context["learner_profile"]


@pytest.mark.asyncio
async def test_initial_budget_and_suggestions_do_not_override_saved_goals(api):
    client, headers, sessions = api
    async with sessions() as db:
        node = await db.get(KnowledgeNode, "a")
        node.domain = "遥感影像处理"
        await db.commit()
    await client.put("/api/user/learner-profile", headers=headers[1], json=PROFILE)
    plan = (await client.get("/api/path/plan", headers=headers[1])).json()
    assert plan["goal"]["dailyMinutes"] == 30
    assert plan["goal"]["nodeIds"] == []
    assert plan["profileSuggestion"]["nodeIds"] == ["a"]
    assert all(state["mastery"] == 0 for state in plan["states"].values())
    response = await client.put(
        "/api/path/goal", headers=headers[1], json={"nodeIds": ["c"], "dailyMinutes": 60}
    )
    assert response.status_code == 200, response.text
    edited = copy.deepcopy(PROFILE)
    edited["selections"]["time"] = ["15"]
    await client.put("/api/user/learner-profile", headers=headers[1], json=edited)
    plan = (await client.get("/api/path/plan", headers=headers[1])).json()
    assert plan["goal"]["dailyMinutes"] == 60
    assert plan["goal"]["nodeIds"] == ["c"]
    assert plan["profileSuggestion"]["dailyMinutes"] == 15


@pytest.mark.asyncio
async def test_chat_and_explain_use_latest_profile(api, monkeypatch):
    import app.api.ai as ai_api

    client, headers, sessions = api
    contexts = []

    async def reply(question, node, context, history):
        contexts.append(context)
        return {"answer": "测试指导", "metadata": {"context": context, "references": []}}

    monkeypatch.setattr(ai_api.companion_service, "reply", reply)
    monkeypatch.setattr(ai_api, "SessionLocal", sessions)
    await client.put("/api/user/learner-profile", headers=headers[1], json=PROFILE)
    response = await client.post("/api/ai/explain", headers=headers[1], json={"nodeId": "a"})
    assert response.status_code == 200, response.text
    assert contexts[-1]["learner_profile"]["学习时间"] == ["30 分钟"]
    response = await client.post("/api/ai/chat", headers=headers[1], json={"message": "解释一下"})
    assert response.status_code == 200, response.text
    events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]
    conversation = events[0]["conversationId"]
    edited = copy.deepcopy(PROFILE)
    edited["selections"]["styles"] = ["theory"]
    await client.put("/api/user/learner-profile", headers=headers[1], json=edited)
    response = await client.post(
        "/api/ai/chat",
        headers=headers[1],
        json={
            "conversationId": conversation,
            "message": "继续",
        },
    )
    assert response.status_code == 200
    assert contexts[-1]["learner_profile"]["讲解偏好"] == ["深入公式原理"]


def test_profile_rejects_missing_groups_and_unknown_schema_version():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        LearnerProfileWrite.model_validate({"version": 1, "selections": {}})
    with pytest.raises(ValidationError):
        LearnerProfileWrite.model_validate({**PROFILE, "version": 2})


@pytest.mark.asyncio
async def test_model_receives_profile_and_self_report_boundary(monkeypatch):
    from types import SimpleNamespace

    import app.services.xiaoyu as xiaoyu

    captured = []

    class Retriever:
        def retrieve(self, question, node_id):
            return []

    class Generator:
        async def generate(self, messages):
            captured.extend(messages)
            return json.dumps({"answer": "分步解释", "cited_chunk_ids": [], "suggested_action": "练习"})

    monkeypatch.setattr(xiaoyu, "settings", SimpleNamespace(llm_enabled=True))
    profile = {"讲解偏好": ["逐步拆解知识"], "Python 基础": ["了解一些概念"]}
    result = await xiaoyu.CompanionService(Retriever(), Generator()).reply(
        "如何处理影像", None, {"learner_profile": profile}, []
    )
    assert result["metadata"]["mode"] == "model_only"
    assert json.loads(captured[1]["content"])["context"]["learner_profile"] == profile
    assert "基础标签仅为自评，不代表已掌握" in captured[0]["content"]
