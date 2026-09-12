"""AI 对话相关模型。"""

from app.schemas.common import CamelModel


class MessageOut(CamelModel):
    id: int
    role: str
    content: str


class ConversationOut(CamelModel):
    id: str
    title: str
    category: str
    messages: list[MessageOut]


class ConversationCreate(CamelModel):
    title: str | None = None
    category: str | None = None


class ChatContext(CamelModel):
    node: str | None = None
    stage: str | None = None
    progress: str | None = None


class ChatRequest(CamelModel):
    conversation_id: str | None = None
    message: str
    context: ChatContext | None = None


class ExplainRequest(CamelModel):
    node_id: str


class ExplainResponse(CamelModel):
    explanation: str
