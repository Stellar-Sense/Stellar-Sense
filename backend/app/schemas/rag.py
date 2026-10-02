"""独立 Retrieval API 的请求与响应契约。"""

from pydantic import Field, field_validator

from app.schemas.common import CamelModel


class RetrievalRequest(CamelModel):
    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=50)
    node_id: str | int | None = None

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("query 不能为空")
        return value


class RetrievalHitOut(CamelModel):
    chunk_id: str
    node_id: str | int | None
    resource_name: str
    section: str
    content: str
    score: float


class RetrievalResponse(CamelModel):
    query: str
    hits: list[RetrievalHitOut]
