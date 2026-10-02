import zipfile
from pathlib import Path

import pytest
from fastapi import HTTPException
from pypdf import PdfWriter

from app.api import rag as rag_api
from app.main import app
from app.rag.chunker import ChunkerConfig, DocumentChunker
from app.rag.index import LocalRetrievalIndex
from app.rag.models import Document, DocumentSection, ResourceInput
from app.rag.parser import DocumentParser, UnsupportedDocumentError
from app.rag.retriever import LocalRetriever
from app.rag.service import RetrievalService
from app.schemas.rag import RetrievalHitOut, RetrievalRequest, RetrievalResponse

FIXTURES = Path(__file__).parent / "fixtures"


def _resources() -> list[ResourceInput]:
    return [
        ResourceInput(
            source_path=str(FIXTURES / "atmospheric_correction.md"),
            node_id="大气校正",
        ),
        ResourceInput(
            source_path=str(FIXTURES / "geometric_correction.txt"),
            node_id="几何校正",
        ),
        ResourceInput(
            source_path=str(FIXTURES / "image_registration.md"),
            node_id="遥感影像配准",
        ),
    ]


def _build_service(tmp_path: Path) -> RetrievalService:
    service = RetrievalService(index_path=tmp_path / "rag_index.json")
    service.build_from_resources(_resources())
    return service


def test_text_and_markdown_parser_preserves_source_and_sections() -> None:
    parser = DocumentParser()
    markdown = parser.parse(
        FIXTURES / "atmospheric_correction.md",
        node_id="大气校正",
        metadata={"course": "遥感原理"},
    )
    text = parser.parse(FIXTURES / "geometric_correction.txt", node_id="几何校正")

    assert markdown.resource_name == "atmospheric_correction.md"
    assert markdown.resource_id.startswith("res_")
    assert markdown.node_id == "大气校正"
    assert markdown.metadata["course"] == "遥感原理"
    assert [section.heading for section in markdown.sections] == ["大气校正", "主要作用"]
    assert text.sections[0].heading == "第一章 几何校正"
    assert "坐标变换" in text.text


def test_docx_parser_preserves_heading(tmp_path: Path) -> None:
    path = tmp_path / "sample.docx"
    document_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>大气校正</w:t></w:r></w:p>
    <w:p><w:r><w:t>用于降低大气散射对影像的影响。</w:t></w:r></w:p>
  </w:body>
</w:document>"""
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("word/document.xml", document_xml)

    document = DocumentParser().parse(path)

    assert document.sections == (
        DocumentSection(heading="大气校正", content="用于降低大气散射对影像的影响。"),
    )


def test_textless_pdf_is_explicitly_unsupported(tmp_path: Path) -> None:
    path = tmp_path / "scan.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    with path.open("wb") as output:
        writer.write(output)

    with pytest.raises(UnsupportedDocumentError, match="不支持 OCR"):
        DocumentParser().parse(path)


def test_chunker_respects_size_and_section() -> None:
    document = Document(
        resource_id="res_test",
        resource_name="test.md",
        source_path="test.md",
        node_id="大气校正",
        text="",
        sections=(
            DocumentSection(
                heading="大气校正",
                content=("大气校正用于消除散射影响。" * 18) + "最终得到地表反射率。",
            ),
        ),
    )
    chunks = DocumentChunker(ChunkerConfig(chunk_size=80, overlap=12)).chunk(document)

    assert len(chunks) > 1
    assert all(len(chunk.content) <= 80 for chunk in chunks)
    assert all(chunk.section == "大气校正" for chunk in chunks)
    assert [chunk.chunk_index for chunk in chunks] == list(range(len(chunks)))


def test_chunk_id_is_stable() -> None:
    document = Document(
        resource_id="res_stable",
        resource_name="stable.txt",
        source_path="stable.txt",
        node_id=1,
        text="大气校正用于提高定量遥感结果的可靠性。",
        sections=(DocumentSection(heading="正文", content="大气校正用于提高定量遥感结果的可靠性。"),),
    )
    chunker = DocumentChunker()

    first = chunker.chunk(document)
    second = chunker.chunk(document)

    assert [chunk.chunk_id for chunk in first] == [chunk.chunk_id for chunk in second]
    assert first[0].chunk_id.startswith("chk_")


def test_index_build_save_and_load(tmp_path: Path) -> None:
    service = _build_service(tmp_path)
    index_path = tmp_path / "rag_index.json"

    loaded = LocalRetrievalIndex.load(index_path)
    loaded_hits = LocalRetriever(loaded).retrieve("大气校正有什么作用", top_k=1)
    service_hits = service.retrieve("大气校正有什么作用", top_k=1)

    assert index_path.exists()
    assert len(loaded) == 4
    assert loaded_hits[0].chunk_id == service_hits[0].chunk_id


def test_service_rebuild_replaces_persisted_index(tmp_path: Path) -> None:
    service = _build_service(tmp_path)
    service.rebuild([_resources()[1]])

    reloaded = RetrievalService(index_path=tmp_path / "rag_index.json")
    rebuilt_index = reloaded.load()

    assert len(rebuilt_index) == 1
    assert rebuilt_index.chunks[0].node_id == "几何校正"
    assert reloaded.retrieve("几何校正", top_k=1)[0].node_id == "几何校正"


def test_basic_retrieval_prefers_atmospheric_correction(tmp_path: Path) -> None:
    service = _build_service(tmp_path)

    hits = service.retrieve("大气校正有什么作用", top_k=3)

    assert hits
    assert hits[0].node_id == "大气校正"
    assert hits[0].resource_name == "atmospheric_correction.md"
    assert 0 < hits[0].score <= 1


def test_top_k_and_node_id_filter(tmp_path: Path) -> None:
    service = _build_service(tmp_path)

    hits = service.retrieve("遥感影像校正配准", top_k=2)
    filtered = service.retrieve("校正", top_k=5, node_id="几何校正")
    numeric_filter = service.retrieve("校正", top_k=5, node_id=999)

    assert len(hits) == 2
    assert filtered
    assert all(hit.node_id == "几何校正" for hit in filtered)
    assert numeric_filter == []


def test_api_schema_uses_camel_case_and_route_is_registered(tmp_path: Path, monkeypatch) -> None:
    request = RetrievalRequest.model_validate(
        {"query": "  什么是大气校正？  ", "topK": 3, "nodeId": "大气校正"}
    )
    response = RetrievalResponse(
        query=request.query,
        hits=[
            RetrievalHitOut(
                chunk_id="chk_1",
                node_id=request.node_id,
                resource_name="资料.md",
                section="第一节",
                content="大气校正说明",
                score=0.82,
            )
        ],
    )
    payload = response.model_dump(by_alias=True)

    assert request.top_k == 3
    assert request.query == "什么是大气校正？"
    assert payload["hits"][0]["chunkId"] == "chk_1"
    assert payload["hits"][0]["resourceName"] == "资料.md"
    assert "/api/rag/retrieve" in app.openapi()["paths"]

    monkeypatch.setattr(rag_api, "retrieval_service", _build_service(tmp_path))
    api_response = rag_api.retrieve(request)
    assert api_response.query == request.query
    assert api_response.hits[0].node_id == "大气校正"


def test_api_reports_missing_index(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(
        rag_api,
        "retrieval_service",
        RetrievalService(index_path=tmp_path / "missing.json"),
    )

    with pytest.raises(HTTPException) as exc_info:
        rag_api.retrieve(RetrievalRequest(query="大气校正"))

    assert exc_info.value.status_code == 503
    assert "尚未建立" in str(exc_info.value.detail)


def test_api_reports_invalid_index_without_exposing_path(tmp_path: Path, monkeypatch) -> None:
    invalid_index = tmp_path / "rag_index.json"
    invalid_index.write_text("{invalid", encoding="utf-8")
    monkeypatch.setattr(
        rag_api,
        "retrieval_service",
        RetrievalService(index_path=invalid_index),
    )

    with pytest.raises(HTTPException) as exc_info:
        rag_api.retrieve(RetrievalRequest(query="大气校正"))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "RAG 索引不可用：索引格式或内容无效"
    assert str(tmp_path) not in str(exc_info.value.detail)
