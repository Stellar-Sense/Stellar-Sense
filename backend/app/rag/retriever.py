"""统一 Retriever 接口与本地 BM25 实现。"""

import math
from collections import Counter
from typing import Protocol

from app.rag.index import LocalRetrievalIndex, tokenize
from app.rag.models import NodeId, RetrievalHit


class Retriever(Protocol):
    def retrieve(
        self, query: str, *, top_k: int = 5, node_id: NodeId | None = None
    ) -> list[RetrievalHit]: ...


class LocalRetriever:
    """BM25 排序；中文使用字符 n-gram，结果无需外部模型或服务。"""

    def __init__(self, index: LocalRetrievalIndex, *, k1: float = 1.5, b: float = 0.75) -> None:
        self.index = index
        self.k1 = k1
        self.b = b

    def retrieve(self, query: str, *, top_k: int = 5, node_id: NodeId | None = None) -> list[RetrievalHit]:
        normalized_query = query.strip()
        if not normalized_query:
            raise ValueError("query 不能为空")
        if top_k <= 0:
            raise ValueError("top_k 必须大于 0")

        query_frequency = Counter(tokenize(normalized_query))
        if not query_frequency or len(self.index) == 0:
            return []

        scored: list[tuple[float, int]] = []
        for index, (chunk, term_frequency) in enumerate(
            zip(self.index.chunks, self.index.term_frequencies, strict=True)
        ):
            if node_id is not None and str(chunk.node_id) != str(node_id):
                continue
            raw_score = self._bm25(term_frequency, query_frequency)
            if raw_score > 0:
                scored.append((raw_score, index))

        scored.sort(
            key=lambda item: (
                -item[0],
                self.index.chunks[item[1]].resource_name,
                self.index.chunks[item[1]].chunk_index,
            )
        )
        scale = max(len(query_frequency), 1)
        return [
            RetrievalHit(
                chunk_id=self.index.chunks[index].chunk_id,
                node_id=self.index.chunks[index].node_id,
                resource_name=self.index.chunks[index].resource_name,
                section=self.index.chunks[index].section,
                content=self.index.chunks[index].content,
                score=round(1 - math.exp(-raw_score / scale), 6),
            )
            for raw_score, index in scored[:top_k]
        ]

    def _bm25(self, term_frequency: Counter[str], query_frequency: Counter[str]) -> float:
        document_count = len(self.index)
        document_length = sum(term_frequency.values())
        average_length = self.index.average_document_length or 1.0
        score = 0.0
        for token, query_count in query_frequency.items():
            frequency = term_frequency.get(token, 0)
            if frequency == 0:
                continue
            document_frequency = self.index.document_frequencies.get(token, 0)
            inverse_document_frequency = math.log(
                1 + (document_count - document_frequency + 0.5) / (document_frequency + 0.5)
            )
            denominator = frequency + self.k1 * (1 - self.b + self.b * document_length / average_length)
            score += inverse_document_frequency * frequency * (self.k1 + 1) / denominator * query_count
        return score
