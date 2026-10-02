import json
import logging
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.rag.models import ResourceInput
from app.rag.service import RetrievalService
from app.services.xiaoyu import CompanionService, RagCompanionRetriever


class Generator:
    def __init__(self, cited_chunk_ids: list[str]):
        self.cited_chunk_ids = cited_chunk_ids

    async def generate(self, messages):
        return json.dumps(
            {
                "answer": "直方图均衡化通过重新分配灰度改善整体对比度。",
                "cited_chunk_ids": self.cited_chunk_ids,
                "suggested_action": "对比增强前后的直方图。",
            },
            ensure_ascii=False,
        )


class LegacySummary:
    def retrieve(self, question, node_id, limit=4):
        if node_id != "图像增强":
            return []
        return [
            {
                "chunkId": "KP_legacy",
                "text": "旧摘要：直方图均衡化可改善对比度。",
                "sourceDocument": "knowledge.json",
                "locator": "图像增强",
                "evidenceKind": "summary",
                "originalResourceHint": "课程摘要",
            }
        ]


class EmptyLegacySummary:
    def retrieve(self, question, node_id, limit=4):
        return []


class UnexpectedRetrievalService:
    def retrieve(self, query, *, top_k=5, node_id=None):
        raise RuntimeError("private retrieval failure at C:\\Users\\private\\index.json")


class UnexpectedCompanionRetriever:
    def retrieve(self, question, node_id):
        raise RuntimeError("private companion retrieval failure")


def build_image_enhancement_index(tmp_path: Path) -> RetrievalService:
    enhancement = tmp_path / "image_enhancement.md"
    enhancement.write_text(
        "# 直方图均衡化\n直方图均衡化通过重新分配像素灰度，提高低对比度遥感影像的整体对比度。",
        encoding="utf-8",
    )
    correction = tmp_path / "radiometric_correction.md"
    correction.write_text(
        "# 辐射校正\n辐射校正用于消除传感器与大气造成的辐射误差。",
        encoding="utf-8",
    )
    service = RetrievalService(index_path=tmp_path / "rag_index.json")
    service.build_from_resources(
        [
            ResourceInput(source_path=str(enhancement), node_id="图像增强"),
            ResourceInput(source_path=str(correction), node_id="辐射校正"),
        ]
    )
    return service


@pytest.mark.asyncio
async def test_bm25_hit_flows_through_companion_with_validated_reference(tmp_path: Path) -> None:
    service = build_image_enhancement_index(tmp_path)
    expected = service.retrieve("直方图均衡化有什么作用", top_k=1, node_id="图像增强")[0]
    companion = CompanionService(
        RagCompanionRetriever(service=service, fallback=EmptyLegacySummary()),
        Generator([expected.chunk_id]),
    )

    with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
        result = await companion.reply(
            "直方图均衡化有什么作用？",
            SimpleNamespace(id="图像增强", title="图像增强", summary="摘要"),
            {"scene": "preview", "learner_level": "beginner"},
            [],
        )

    reference = result["metadata"]["references"][0]
    assert result["metadata"]["mode"] == "generated"
    assert result["metadata"]["retrievalMode"] == "bm25"
    assert result["metadata"]["retrievalReason"] is None
    assert reference["chunkId"] == expected.chunk_id
    assert reference["sourceDocument"] == "image_enhancement.md"
    assert reference["locator"] == "直方图均衡化"
    assert reference["nodeId"] == "图像增强"
    assert reference["evidenceKind"] == "retrieved_chunk"


@pytest.mark.asyncio
async def test_unknown_bm25_citation_is_rejected(tmp_path: Path) -> None:
    service = build_image_enhancement_index(tmp_path)
    companion = CompanionService(
        RagCompanionRetriever(service=service, fallback=EmptyLegacySummary()),
        Generator(["chk_invented"]),
    )

    with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
        result = await companion.reply(
            "直方图均衡化有什么作用？",
            SimpleNamespace(id="图像增强", title="图像增强", summary="摘要"),
            {},
            [],
        )

    assert result["metadata"]["mode"] == "fallback"
    assert result["metadata"]["retrievalMode"] == "bm25"
    assert result["metadata"]["references"] == []


@pytest.mark.asyncio
async def test_missing_bm25_index_uses_summary_fallback(tmp_path: Path) -> None:
    adapter = RagCompanionRetriever(
        service=RetrievalService(index_path=tmp_path / "missing.json"),
        fallback=LegacySummary(),
    )
    companion = CompanionService(adapter, Generator(["KP_legacy"]))

    with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
        result = await companion.reply(
            "直方图均衡化有什么作用？",
            SimpleNamespace(id="图像增强", title="图像增强", summary="摘要"),
            {},
            [],
        )

    assert result["metadata"]["mode"] == "generated"
    assert result["metadata"]["retrievalMode"] == "summary_fallback"
    assert result["metadata"]["retrievalReason"] == "index_not_found"
    assert result["metadata"]["references"][0]["evidenceKind"] == "summary"


@pytest.mark.asyncio
async def test_invalid_bm25_index_reports_safe_reason_and_uses_summary(tmp_path: Path) -> None:
    invalid_index = tmp_path / "rag_index.json"
    invalid_index.write_text("{invalid", encoding="utf-8")
    adapter = RagCompanionRetriever(
        service=RetrievalService(index_path=invalid_index),
        fallback=LegacySummary(),
    )
    companion = CompanionService(adapter, Generator(["KP_legacy"]))

    with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
        result = await companion.reply(
            "直方图均衡化有什么作用？",
            SimpleNamespace(id="图像增强", title="图像增强", summary="摘要"),
            {},
            [],
        )

    assert result["metadata"]["retrievalMode"] == "summary_fallback"
    assert result["metadata"]["retrievalReason"] == "index_invalid"
    assert str(tmp_path) not in json.dumps(result, ensure_ascii=False)


@pytest.mark.asyncio
async def test_unexpected_retrieval_error_is_logged_and_not_exposed(caplog) -> None:
    adapter = RagCompanionRetriever(
        service=UnexpectedRetrievalService(),
        fallback=LegacySummary(),
    )
    companion = CompanionService(adapter, Generator(["KP_legacy"]))

    with (
        caplog.at_level(logging.ERROR, logger="stellar.rag"),
        patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)),
    ):
        result = await companion.reply(
            "直方图均衡化有什么作用？",
            SimpleNamespace(id="图像增强", title="图像增强", summary="摘要"),
            {},
            [],
        )

    assert result["metadata"]["retrievalMode"] == "summary_fallback"
    assert result["metadata"]["retrievalReason"] == "retrieval_error"
    assert "private retrieval failure" not in json.dumps(result, ensure_ascii=False)
    assert any(record.exc_info for record in caplog.records)


@pytest.mark.asyncio
async def test_companion_logs_unexpected_retriever_error_and_returns_safe_fallback(caplog) -> None:
    companion = CompanionService(UnexpectedCompanionRetriever(), Generator([]))

    with (
        caplog.at_level(logging.ERROR, logger="stellar.rag"),
        patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)),
    ):
        result = await companion.reply("问题", None, {}, [])

    assert result["metadata"]["mode"] == "fallback"
    assert result["metadata"]["retrievalReason"] == "retrieval_error"
    assert "private companion retrieval failure" not in json.dumps(result, ensure_ascii=False)
    assert any(record.exc_info for record in caplog.records)


@pytest.mark.asyncio
async def test_no_bm25_or_summary_material_uses_model_only(tmp_path: Path) -> None:
    adapter = RagCompanionRetriever(
        service=RetrievalService(index_path=tmp_path / "missing.json"),
        fallback=EmptyLegacySummary(),
    )
    companion = CompanionService(adapter, Generator([]))

    with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
        result = await companion.reply("直方图均衡化有什么作用？", None, {}, [])

    assert result["metadata"]["mode"] == "model_only"
    assert result["metadata"]["retrievalMode"] == "none"
    assert result["metadata"]["retrievalReason"] == "index_not_found"
    assert result["metadata"]["references"] == []


def test_node_filter_and_all_course_retrieval(tmp_path: Path) -> None:
    service = build_image_enhancement_index(tmp_path)
    adapter = RagCompanionRetriever(service=service, fallback=EmptyLegacySummary())

    filtered = adapter.retrieve("直方图均衡化提高对比度", "图像增强", limit=5)
    all_course = adapter.retrieve("辐射校正", None, limit=5)

    assert filtered
    assert all(row["nodeId"] == "图像增强" for row in filtered)
    assert any(row["nodeId"] == "辐射校正" for row in all_course)
