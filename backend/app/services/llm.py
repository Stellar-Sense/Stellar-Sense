"""LLM 客户端：OpenAI 兼容接口（默认 DeepSeek）。

- 配置了 LLM_API_KEY：走线上流式接口；
- 未配置或线上调用失败：自动降级为内置 Mock 回复，保证演示不中断。
"""

import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.config import settings
from app.services import mock_llm

logger = logging.getLogger("stellar.llm")


class LLMService:
    @property
    def enabled(self) -> bool:
        return settings.llm_enabled

    def _payload(self, messages: list[dict], stream: bool) -> dict:
        return {
            "model": settings.llm_model,
            "messages": messages,
            "stream": stream,
            "temperature": 0.7,
        }

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }

    async def chat(self, messages: list[dict]) -> str:
        """一次性返回完整回复（用于路径分析、AI 解释等短文本场景）。"""
        if not self.enabled:
            return mock_llm.mock_reply(_last_user_message(messages))
        try:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                    headers=self._headers,
                    json=self._payload(messages, stream=False),
                )
                response.raise_for_status()
                data = response.json()
                return str(data["choices"][0]["message"]["content"])
        except Exception as exc:  # 线上失败降级 Mock
            logger.warning("LLM 调用失败，降级为 Mock：%s", exc)
            return mock_llm.mock_reply(_last_user_message(messages))

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        if not self.enabled:
            async for chunk in mock_llm.mock_stream(_last_user_message(messages)):
                yield chunk
            return

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(settings.llm_timeout_seconds, connect=10.0)
            ) as client:
                async with client.stream(
                    "POST",
                    f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                    headers=self._headers,
                    json=self._payload(messages, stream=True),
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            payload = json.loads(data)
                            delta = payload["choices"][0]["delta"].get("content")
                        except (KeyError, IndexError, json.JSONDecodeError):
                            continue
                        if delta:
                            yield delta
        except Exception as exc:  # 线上失败降级 Mock
            logger.warning("LLM 流式调用失败，降级为 Mock：%s", exc)
            async for chunk in mock_llm.mock_stream(_last_user_message(messages)):
                yield chunk


def _last_user_message(messages: list[dict]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return str(message.get("content", ""))
    return ""


llm_service = LLMService()
