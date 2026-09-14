import pytest
from sqlalchemy import func, select

from app.models.adaptive import LearningEvaluation, LearningEvent, LearningTask, StateChange

pytestmark = pytest.mark.asyncio


def answer(task="a1", request="request-0001", node="a", value="0"):
    return {
        "requestId": request,
        "nodeId": node,
        "kind": "answer",
        "taskId": task,
        "answer": value,
        "durationSeconds": 60,
    }


async def test_administrator_is_separate_from_token_and_user_role(api):
    client, headers, _ = api
    assert (await client.get("/api/admin/knowledge/graph")).status_code == 401
    assert (await client.get("/api/admin/knowledge/graph", headers=headers[2])).status_code == 403
    assert (await client.get("/api/admin/knowledge/graph", headers=headers[1])).status_code == 200
    assert "admin" not in (await client.get("/api/auth/me", headers=headers[2])).json()["role"]
    assert "admin" in (await client.get("/api/auth/me", headers=headers[1])).json()["role"]
    response = await client.post(
        "/api/admin/knowledge/nodes",
        headers=headers[2],
        json={"name": "x", "domain": "y", "expectedRevision": 1},
    )
    assert response.status_code == 403


async def test_graph_cycle_duplicate_and_optimistic_concurrency(api):
    client, headers, _ = api
    payload = {
        "fromId": "c",
        "toId": "a",
        "relation": "prerequisite",
        "reason": "测试依赖",
        "expectedRevision": 1,
    }
    assert (
        await client.post("/api/admin/knowledge/edges", headers=headers[1], json=payload)
    ).status_code == 422
    payload.update(fromId="a", toId="b")
    assert (
        await client.post("/api/admin/knowledge/edges", headers=headers[1], json=payload)
    ).status_code == 409
    payload.update(fromId="a", toId="a")
    assert (
        await client.post("/api/admin/knowledge/edges", headers=headers[1], json=payload)
    ).status_code == 422
    payload.update(fromId="c", toId="a", relation="related")
    response = await client.post("/api/admin/knowledge/edges", headers=headers[1], json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["revision"] == 2
    payload.update(fromId="b", toId="a")
    assert (
        await client.post("/api/admin/knowledge/edges", headers=headers[1], json=payload)
    ).status_code == 409
    public = (await client.get("/api/knowledge/graph", headers=headers[2])).json()
    assert len(public["edges"]) == 2
    assert len(public["relations"]) == 3


async def test_node_crud_and_protected_dependency(api):
    client, headers, _ = api
    payload = {"name": "新节点", "domain": "新领域", "expectedRevision": 1, "minutes": 15}
    created = await client.post("/api/admin/knowledge/nodes", headers=headers[1], json=payload)
    assert created.status_code == 201, created.text
    node_id = created.json()["id"]
    payload.update(name="修改名称", expectedRevision=2)
    assert (
        await client.put(f"/api/admin/knowledge/nodes/{node_id}", headers=headers[1], json=payload)
    ).status_code == 200
    content = (await client.get(f"/api/learning/nodes/{node_id}", headers=headers[2])).json()
    assert content["title"] == "修改名称"
    assert (
        await client.delete("/api/admin/knowledge/nodes/a?expectedRevision=3", headers=headers[1])
    ).status_code == 409
    assert (
        await client.delete(f"/api/admin/knowledge/nodes/{node_id}?expectedRevision=3", headers=headers[1])
    ).status_code == 200


async def test_evidence_unlock_idempotency_and_frozen_replay(api):
    client, headers, sessions = api
    user = headers[2]
    first = await client.put("/api/path/goal", headers=user, json={"nodeIds": ["c"], "dailyMinutes": 20})
    assert first.status_code == 200, first.text
    plan = first.json()
    assert [(entry["nodeId"], entry["status"]) for entry in plan["entries"]] == [
        ("a", "ready"),
        ("b", "blocked"),
        ("c", "blocked"),
    ]
    blocked = await client.post("/api/learning/events", headers=user, json=answer("b1", "blocked-001", "b"))
    assert blocked.status_code == 409
    assert (await client.post("/api/learning/nodes/a/complete", headers=user)).status_code == 409
    one = await client.post("/api/learning/events", headers=user, json=answer())
    assert one.status_code == 200, one.text
    assert one.json()["state"]["confidence"] == 30
    repeat = await client.post("/api/learning/events", headers=user, json=answer())
    assert repeat.json()["id"] == one.json()["id"]
    assert (
        await client.post("/api/learning/events", headers=user, json=answer(value="1"))
    ).status_code == 409
    middle = (await client.get("/api/path/plan", headers=user)).json()
    assert next(row for row in middle["entries"] if row["nodeId"] == "b")["status"] == "blocked"
    two = await client.post("/api/learning/events", headers=user, json=answer("a2", "request-0002"))
    assert two.status_code == 200, two.text
    assert two.json()["state"]["confidence"] == 60
    final = (await client.get("/api/path/plan", headers=user)).json()
    assert final["nextNodeId"] == "b"
    assert "a" in final["completedNodeIds"]
    dashboard = (await client.get("/api/dashboard/summary", headers=user)).json()
    assert dashboard["suggestion"]["topic"] == "B"
    graph = (await client.get("/api/knowledge/graph", headers=user)).json()
    assert next(node for node in graph["nodes"] if node["id"] == "a")["status"] == "mastered"
    overview = (await client.get("/api/learning/nodes", headers=user)).json()
    assert overview["currentNodeId"] == "b"
    same = (await client.post("/api/path/regenerate", headers=user)).json()
    assert same["version"] == final["version"] and not same["changed"]
    replay = (await client.get(f"/api/path/history/{plan['version']}", headers=user)).json()
    assert replay["verified"] is True
    assert replay["result"]["nextNodeId"] == "a"
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(LearningEvaluation)) == 2
        assert await db.scalar(select(func.count()).select_from(StateChange)) == 2
    assert (await client.get(f"/api/path/history/{plan['version']}", headers=headers[3])).status_code == 404
    assert (
        await client.post(f"/api/learning/events/{one.json()['id']}/retry", headers=headers[3])
    ).status_code == 404


async def test_weak_evidence_and_missing_ai_never_grant_mastery(api):
    client, headers, sessions = api
    for kind in ("read", "skip", "hint"):
        result = await client.post(
            "/api/learning/events",
            headers=headers[2],
            json={"requestId": f"weak-{kind}-001", "nodeId": "a", "kind": kind},
        )
        assert result.status_code == 200, result.text
        assert result.json()["state"]["mastery"] == 0
    async with sessions() as db:
        db.add(
            LearningTask(
                id="subjective",
                node_id="a",
                title="解释题",
                kind="explanation",
                difficulty=1,
                minutes=10,
                configuration={
                    "prompt": "解释概念",
                    "reference": "参考资料",
                    "source": "教材第1章",
                    "rubric": "概念准确性",
                },
            )
        )
        await db.commit()
    result = await client.post(
        "/api/learning/events", headers=headers[2], json=answer("subjective", "pending-001", value="我的理解")
    )
    assert result.status_code == 200, result.text
    assert result.json()["status"] == "pending" and result.json()["score"] is None
    retry = await client.post(f"/api/learning/events/{result.json()['id']}/retry", headers=headers[2])
    assert retry.json()["state"]["mastery"] == 0
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(LearningEvaluation)) == 0
        assert await db.scalar(select(func.count()).select_from(LearningEvent)) == 4


async def test_task_answers_are_private_and_goal_budget_changes_schedule(api):
    client, headers, _ = api
    tasks = (await client.get("/api/learning/nodes/a/tasks", headers=headers[2])).json()
    assert "answerIndex" not in tasks["tasks"][0] and "reference" not in tasks["tasks"][0]
    one = (
        await client.put("/api/path/goal", headers=headers[2], json={"nodeIds": ["c"], "dailyMinutes": 10})
    ).json()
    two = (
        await client.put("/api/path/goal", headers=headers[2], json={"nodeIds": ["c"], "dailyMinutes": 60})
    ).json()
    assert two["version"] > one["version"]
    assert one["estimatedDays"] > two["estimatedDays"]
    unchanged = (
        await client.put("/api/path/goal", headers=headers[2], json={"nodeIds": ["c"], "dailyMinutes": 60})
    ).json()
    assert unchanged["version"] == two["version"]


async def test_subjective_retry_uses_frozen_task_and_updates_once(api, monkeypatch):
    client, headers, sessions = api
    async with sessions() as db:
        db.add(
            LearningTask(
                id="essay",
                node_id="a",
                title="实训说明",
                kind="explanation",
                difficulty=2,
                minutes=10,
                configuration={
                    "prompt": "为什么需要独立检查点？",
                    "reference": "检查点不得参与拟合",
                    "source": "课程量规 v1",
                    "rubric": "独立性",
                },
            )
        )
        await db.commit()
    initial = await client.post(
        "/api/learning/events",
        headers=headers[2],
        json=answer("essay", "essay-0001", value="独立点用于检验泛化误差"),
    )
    assert initial.json()["status"] == "pending"
    async with sessions() as db:
        task = await db.get(LearningTask, "essay")
        task.configuration = {**task.configuration, "reference": "已修改的参考资料"}
        await db.commit()

    async def evaluated(task, student_answer):
        assert task["reference"] == "检查点不得参与拟合"
        assert "独立点" in student_answer
        return {
            "score": 90,
            "feedback": "理解正确，注意禁止检查点参与调参",
            "source": "llm:test",
            "evidence": {"reference": "课程量规 v1"},
            "errorTags": [],
        }

    monkeypatch.setattr("app.services.adaptive.evaluate_answer", evaluated)
    endpoint = f"/api/learning/events/{initial.json()['id']}/retry"
    scored = await client.post(endpoint, headers=headers[2])
    assert scored.json()["score"] == 90
    await client.post(endpoint, headers=headers[2])
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(LearningEvaluation)) == 1
        assert await db.scalar(select(func.count()).select_from(StateChange)) == 1


async def test_new_dependency_relocks_nodes_and_old_path_replays(api):
    client, headers, _ = api
    for task in ("a1", "a2"):
        await client.post("/api/learning/events", headers=headers[2], json=answer(task, f"unlock-{task}"))
    prior = (await client.get("/api/path/plan", headers=headers[2])).json()
    assert prior["nextNodeId"] == "b"
    node = (
        await client.post(
            "/api/admin/knowledge/nodes",
            headers=headers[1],
            json={"name": "新先修", "domain": "新领域", "expectedRevision": 1},
        )
    ).json()
    response = await client.post(
        "/api/admin/knowledge/edges",
        headers=headers[1],
        json={
            "fromId": node["id"],
            "toId": "b",
            "relation": "prerequisite",
            "reason": "新增课程约束",
            "expectedRevision": 2,
        },
    )
    assert response.status_code == 201
    current = (await client.get("/api/path/plan", headers=headers[2])).json()
    assert current["version"] > prior["version"]
    assert next(entry for entry in current["entries"] if entry["nodeId"] == "b")["status"] == "blocked"
    history = (await client.get(f"/api/path/history/{prior['version']}", headers=headers[2])).json()
    assert history["verified"] and history["result"]["nextNodeId"] == "b"
