"""面向上层的统一 RetrievalService。"""

from collections.abc import Iterable
from pathlib import Path

from app.rag.chunker import DocumentChunker
from app.rag.index import DEFAULT_INDEX_PATH, LocalRetrievalIndex
from app.rag.models import Chunk, Document, NodeId, ResourceInput, RetrievalHit
from app.rag.parser import DocumentParser
from app.rag.retriever import LocalRetriever, Retriever


class RetrievalService:
    def __init__(
        self,
        *,
        index_path: str | Path = DEFAULT_INDEX_PATH,
        parser: DocumentParser | None = None,
        chunker: DocumentChunker | None = None,
        retriever: Retriever | None = None,
    ) -> None:
        self.index_path = Path(index_path)
        self.parser = parser or DocumentParser()
        self.chunker = chunker or DocumentChunker()
        self._index: LocalRetrievalIndex | None = None
        self._retriever = retriever

    def parse_resources(self, resources: Iterable[ResourceInput]) -> list[Document]:
        return [
            self.parser.parse(
                resource.source_path,
                node_id=resource.node_id,
                resource_id=resource.resource_id,
                metadata=resource.metadata,
            )
            for resource in resources
        ]

    def build(self, documents: Iterable[Document], *, save: bool = True) -> list[Chunk]:
        chunks = self.chunker.chunk_many(list(documents))
        self._index = LocalRetrievalIndex().build(chunks)
        self._retriever = LocalRetriever(self._index)
        if save:
            self._index.save(self.index_path)
        return chunks

    def build_from_resources(self, resources: Iterable[ResourceInput], *, save: bool = True) -> list[Chunk]:
        return self.build(self.parse_resources(resources), save=save)

    def rebuild(self, resources: Iterable[ResourceInput]) -> list[Chunk]:
        """重新解析全部输入资料，替换并持久化现有索引。"""
        return self.build_from_resources(resources, save=True)

    def save(self) -> Path:
        if self._index is None:
            raise RuntimeError("没有可保存的 RAG 索引；请先 build")
        return self._index.save(self.index_path)

    def load(self) -> LocalRetrievalIndex:
        self._index = LocalRetrievalIndex.load(self.index_path)
        self._retriever = LocalRetriever(self._index)
        return self._index

    def retrieve(self, query: str, *, top_k: int = 5, node_id: NodeId | None = None) -> list[RetrievalHit]:
        if self._retriever is None:
            self.load()
        if self._retriever is None:  # pragma: no cover - 仅用于静态类型收窄
            raise RuntimeError("Retriever 初始化失败")
        return self._retriever.retrieve(query, top_k=top_k, node_id=node_id)
