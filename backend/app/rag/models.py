"""RAG 内部数据对象；Python 字段统一使用 snake_case。"""

from dataclasses import dataclass, field
from typing import Any

type NodeId = str | int
type Metadata = dict[str, Any]


@dataclass(frozen=True, slots=True)
class ResourceInput:
    """待解析资料及其业务元数据。"""

    source_path: str
    node_id: NodeId | None = None
    resource_id: str | None = None
    metadata: Metadata = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class DocumentSection:
    """解析后保留下来的标题/页级章节。"""

    heading: str
    content: str


@dataclass(frozen=True, slots=True)
class Document:
    resource_id: str
    resource_name: str
    source_path: str
    node_id: NodeId | None
    text: str
    metadata: Metadata = field(default_factory=dict)
    sections: tuple[DocumentSection, ...] = ()


@dataclass(frozen=True, slots=True)
class Chunk:
    chunk_id: str
    resource_id: str
    resource_name: str
    node_id: NodeId | None
    section: str
    content: str
    chunk_index: int
    metadata: Metadata = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "resource_id": self.resource_id,
            "resource_name": self.resource_name,
            "node_id": self.node_id,
            "section": self.section,
            "content": self.content,
            "chunk_index": self.chunk_index,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Chunk":
        required = {
            "chunk_id",
            "resource_id",
            "resource_name",
            "node_id",
            "section",
            "content",
            "chunk_index",
            "metadata",
        }
        missing = required.difference(data)
        if missing:
            raise ValueError(f"Chunk 数据缺少字段：{', '.join(sorted(missing))}")
        return cls(
            chunk_id=str(data["chunk_id"]),
            resource_id=str(data["resource_id"]),
            resource_name=str(data["resource_name"]),
            node_id=data["node_id"],
            section=str(data["section"]),
            content=str(data["content"]),
            chunk_index=int(data["chunk_index"]),
            metadata=dict(data["metadata"]),
        )


@dataclass(frozen=True, slots=True)
class RetrievalHit:
    chunk_id: str
    node_id: NodeId | None
    resource_name: str
    section: str
    content: str
    score: float
