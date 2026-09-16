"""可保存/加载的本地 BM25 检索索引。"""

import json
import re
import unicodedata
from collections import Counter
from collections.abc import Iterable
from pathlib import Path

from app.rag.models import Chunk

INDEX_VERSION = 1
TOKENIZER_NAME = "unicode-cjk-ngram-v1"
DEFAULT_INDEX_PATH = Path(__file__).resolve().parents[3] / "data" / "processed" / "rag_index.json"
_TOKEN_PATTERN = re.compile(r"[a-z0-9_]+|[\u3400-\u9fff]+")


class IndexFormatError(ValueError):
    """持久化索引格式损坏或版本不兼容。"""


def tokenize(text: str) -> list[str]:
    """英文按词、中文按 1/2/3 字 n-gram 切分，不依赖外部分词模型。"""
    normalized = unicodedata.normalize("NFKC", text).lower()
    tokens: list[str] = []
    for part in _TOKEN_PATTERN.findall(normalized):
        if re.fullmatch(r"[a-z0-9_]+", part):
            tokens.append(f"w:{part}")
            continue
        tokens.extend(f"c1:{char}" for char in part)
        for width in (2, 3):
            tokens.extend(f"c{width}:{part[index : index + width]}" for index in range(len(part) - width + 1))
    return tokens


class LocalRetrievalIndex:
    def __init__(self) -> None:
        self._chunks: tuple[Chunk, ...] = ()
        self._term_frequencies: tuple[Counter[str], ...] = ()
        self._document_frequencies: Counter[str] = Counter()
        self._average_document_length = 0.0
        self._built = False

    @property
    def chunks(self) -> tuple[Chunk, ...]:
        return self._chunks

    @property
    def term_frequencies(self) -> tuple[Counter[str], ...]:
        self._require_built()
        return self._term_frequencies

    @property
    def document_frequencies(self) -> Counter[str]:
        self._require_built()
        return self._document_frequencies

    @property
    def average_document_length(self) -> float:
        self._require_built()
        return self._average_document_length

    def __len__(self) -> int:
        return len(self._chunks)

    def build(self, chunks: Iterable[Chunk]) -> "LocalRetrievalIndex":
        built_chunks = tuple(chunks)
        chunk_ids = [chunk.chunk_id for chunk in built_chunks]
        if len(chunk_ids) != len(set(chunk_ids)):
            raise ValueError("索引中存在重复 chunk_id")

        frequencies = tuple(
            Counter(tokenize(f"{chunk.resource_name}\n{chunk.section}\n{chunk.content}"))
            for chunk in built_chunks
        )
        document_frequencies: Counter[str] = Counter()
        for frequency in frequencies:
            document_frequencies.update(frequency.keys())

        self._chunks = built_chunks
        self._term_frequencies = frequencies
        self._document_frequencies = document_frequencies
        self._average_document_length = (
            sum(sum(frequency.values()) for frequency in frequencies) / len(frequencies)
            if frequencies
            else 0.0
        )
        self._built = True
        return self

    def rebuild(self, chunks: Iterable[Chunk]) -> "LocalRetrievalIndex":
        return self.build(chunks)

    def save(self, path: str | Path = DEFAULT_INDEX_PATH) -> Path:
        self._require_built()
        target = Path(path).expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": INDEX_VERSION,
            "algorithm": "bm25",
            "tokenizer": TOKENIZER_NAME,
            "chunks": [chunk.to_dict() for chunk in self._chunks],
        }
        temporary = target.with_suffix(f"{target.suffix}.tmp")
        try:
            temporary.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8"
            )
            temporary.replace(target)
        except (OSError, TypeError) as exc:
            raise OSError(f"保存 RAG 索引失败：{target}：{exc}") from exc
        return target

    @classmethod
    def load(cls, path: str | Path = DEFAULT_INDEX_PATH) -> "LocalRetrievalIndex":
        target = Path(path).expanduser().resolve()
        if not target.exists():
            raise FileNotFoundError(f"RAG 索引不存在：{target}；请先 build/save")
        try:
            payload = json.loads(target.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise IndexFormatError(f"RAG 索引无法读取：{target}：{exc}") from exc
        if payload.get("version") != INDEX_VERSION:
            raise IndexFormatError(
                f"不支持的 RAG 索引版本：{payload.get('version')}，当前版本：{INDEX_VERSION}"
            )
        if payload.get("tokenizer") != TOKENIZER_NAME:
            raise IndexFormatError(f"不支持的 tokenizer：{payload.get('tokenizer')}")
        chunks_data = payload.get("chunks")
        if not isinstance(chunks_data, list):
            raise IndexFormatError("RAG 索引缺少 chunks 列表")
        try:
            chunks = [Chunk.from_dict(item) for item in chunks_data]
        except (TypeError, ValueError) as exc:
            raise IndexFormatError(f"RAG 索引中的 Chunk 数据无效：{exc}") from exc
        return cls().build(chunks)

    def _require_built(self) -> None:
        if not self._built:
            raise RuntimeError("RAG 索引尚未 build 或 load")
