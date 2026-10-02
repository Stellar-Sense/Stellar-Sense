"""按章节、段落/句子边界和最大字符数生成稳定 Chunk。"""

import hashlib
from dataclasses import dataclass

from app.rag.models import Chunk, Document, DocumentSection

# 中文资料通常一字符承载一个语义单位；800 字可保留足够上下文，又不会让命中片段过长。
DEFAULT_CHUNK_SIZE = 800
# 120 字重叠用于保留跨切分点语义，约占默认 Chunk 的 15%。
DEFAULT_CHUNK_OVERLAP = 120
_BOUNDARIES = ("\n\n", "\n", "。", "！", "？", "；", ". ", "! ", "? ")


@dataclass(frozen=True, slots=True)
class ChunkerConfig:
    chunk_size: int = DEFAULT_CHUNK_SIZE
    overlap: int = DEFAULT_CHUNK_OVERLAP

    def __post_init__(self) -> None:
        if self.chunk_size <= 0:
            raise ValueError("chunk_size 必须大于 0")
        if self.overlap < 0 or self.overlap >= self.chunk_size:
            raise ValueError("overlap 必须大于等于 0 且小于 chunk_size")


class DocumentChunker:
    def __init__(self, config: ChunkerConfig | None = None) -> None:
        self.config = config or ChunkerConfig()

    def chunk(self, document: Document) -> list[Chunk]:
        sections = document.sections or (DocumentSection(heading="正文", content=document.text),)
        chunks: list[Chunk] = []
        for section in sections:
            for content in self._split_text(section.content):
                chunk_index = len(chunks)
                chunks.append(
                    Chunk(
                        chunk_id=self._chunk_id(document.resource_id, chunk_index, content),
                        resource_id=document.resource_id,
                        resource_name=document.resource_name,
                        node_id=document.node_id,
                        section=section.heading or "正文",
                        content=content,
                        chunk_index=chunk_index,
                        metadata={**document.metadata, "source_path": document.source_path},
                    )
                )
        return chunks

    def chunk_many(self, documents: list[Document]) -> list[Chunk]:
        return [chunk for document in documents for chunk in self.chunk(document)]

    def _split_text(self, text: str) -> list[str]:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not normalized:
            return []

        size = self.config.chunk_size
        overlap = self.config.overlap
        parts: list[str] = []
        start = 0
        while start < len(normalized):
            target = min(start + size, len(normalized))
            end = target
            if target < len(normalized):
                window = normalized[start:target]
                minimum = max(int(size * 0.55), 1)
                candidates = [
                    position + len(boundary)
                    for boundary in _BOUNDARIES
                    if (position := window.rfind(boundary)) >= minimum
                ]
                if candidates:
                    end = start + max(candidates)

            content = normalized[start:end].strip()
            if content:
                parts.append(content)
            if end >= len(normalized):
                break

            next_start = max(end - overlap, start + 1)
            while next_start < len(normalized) and normalized[next_start].isspace():
                next_start += 1
            start = next_start
        return parts

    @staticmethod
    def _chunk_id(resource_id: str, chunk_index: int, content: str) -> str:
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        stable_input = f"{resource_id}\0{chunk_index}\0{content_hash}".encode()
        return f"chk_{hashlib.sha256(stable_input).hexdigest()[:24]}"
