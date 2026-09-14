"""AI 对话相关模型。"""

from app.schemas.common import CamelModel
from typing import Literal
from pydantic import Field


class MessageOut(CamelModel):
    id: int
    role: str
    content: str
    metadata: dict | None = None


class ConversationOut(CamelModel):
    id: str
    title: str
    category: str
    messages: list[MessageOut]
    context: dict | None = None


class ConversationCreate(CamelModel):
    title: str | None = None
    category: str | None = None


class ChatContext(CamelModel):
    node: str | None = None
    stage: str | None = None
    progress: str | None = None
    node_id: str | None = None
    learner_level: Literal["beginner", "advanced"] = "beginner"
    scene: Literal["preview", "exam_review"] = "preview"


class ChatRequest(CamelModel):
    conversation_id: str | None = None
    message: str = Field(min_length=1, max_length=2000)
    context: ChatContext | None = None


class ExplainRequest(CamelModel):
    node_id: str
    learner_level: Literal["beginner", "advanced"] = "beginner"
    scene: Literal["preview", "exam_review"] = "preview"


class ExplainResponse(CamelModel):
    explanation: str
    metadata: dict | None = None
