import httpx
import pytest

from app.config import settings
from app.services.evaluator import evaluate_answer


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "content",
    ["null", '{"scores":[]}', '{"scores":[{"criterion":"x","score":999,"evidence":"x"}],"feedback":"x"}'],
)
async def test_invalid_model_evaluation_stays_pending(monkeypatch, content):
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(
        lambda _request: httpx.Response(200, json={"choices": [{"message": {"content": content}}]})
    )
    monkeypatch.setattr(
        "app.services.evaluator.httpx.AsyncClient",
        lambda **kwargs: original_client(transport=transport, **kwargs),
    )
    result = await evaluate_answer(
        {"prompt": "question", "rubric": "rubric", "reference": "text", "source": "source"}, "answer"
    )
    assert result is None
