import pytest

from app.services.llm import llm_service


@pytest.mark.asyncio
async def test_replanning_does_not_delegate_unlocks_to_llm(api, monkeypatch):
    async def fail_if_called(*_args, **_kwargs):
        raise AssertionError("路径与解锁必须由规则生成，不调用聊天模型")

    monkeypatch.setattr(llm_service, "chat", fail_if_called)
    client, headers, _ = api
    response = await client.post("/api/path/regenerate", headers=headers[2])
    assert response.status_code == 200
    assert response.json()["nextNodeId"] == "a"
