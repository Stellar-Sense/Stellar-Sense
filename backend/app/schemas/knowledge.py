"""知识图谱响应模型。"""

from pydantic import Field

from app.schemas.common import CamelModel


class KnowledgeNodeOut(CamelModel):
    id: str
    name: str
    domain: str
    status: str
    x: float
    y: float
    prerequisites: list[str]
    duration: str
    description: str
    progress: int
    kind: str = "concept"
    difficulty: int = 1


class KnowledgeEdgeOut(CamelModel):
    from_: str = Field(alias="from")
    to: str


class KnowledgeGraphOut(CamelModel):
    nodes: list[KnowledgeNodeOut]
    edges: list[KnowledgeEdgeOut]
    domain_order: list[str]
    revision: int = 1
    relations: list[dict] = Field(default_factory=list)
