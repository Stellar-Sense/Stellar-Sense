"""AI 对话接口：会话列表 / 新建会话 / SSE 流式聊天 / 节点解释。"""

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal, get_db
from app.deps import get_current_user
from app.models import Conversation, LearningNode, Message, User
from app.schemas.ai import (
    ChatRequest,
    ConversationCreate,
    ConversationOut,
    ExplainRequest,
    ExplainResponse,
    MessageOut,
)
from app.services.llm import llm_service
from app.services.prompts import build_messages

router = APIRouter()

GREETING = "你好，我是你的遥感学习助手。新的学习会话已开始。你可以直接提出问题，我会给出学习建议和知识解释。"


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _conversation_payload(db: AsyncSession, conversation: Conversation) -> ConversationOut:
    messages = list(
        (
            await db.execute(
                select(Message).where(Message.conversation_id == conversation.id).order_by(Message.id)
            )
        ).scalars()
    )
    return ConversationOut(
        id=conversation.id,
        title=conversation.title,
        category=conversation.category,
        messages=[
            MessageOut(id=message.id, role=message.role, content=message.content) for message in messages
        ],
    )


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[ConversationOut]:
    conversations = list(
        (
            await db.execute(
                select(Conversation)
                .where(Conversation.user_id == user.id)
                .order_by(Conversation.updated_at.desc(), Conversation.created_at.desc())
            )
        ).scalars()
    )
    return [await _conversation_payload(db, conversation) for conversation in conversations]


@router.post("/conversations", response_model=ConversationOut)
async def create_conversation(
    payload: ConversationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationOut:
    conversation = Conversation(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=(payload.title or "新对话"),
        category=(payload.category or "知识问答"),
    )
    db.add(conversation)
    db.add(Message(conversation_id=conversation.id, role="assistant", content=GREETING))
    await db.commit()
    return await _conversation_payload(db, conversation)


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    message_text = payload.message.strip()
    if not message_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="消息不能为空")

    conversation: Conversation | None = None
    if payload.conversation_id:
        conversation = (
            await db.execute(
                select(Conversation).where(
                    Conversation.id == payload.conversation_id,
                    Conversation.user_id == user.id,
                )
            )
        ).scalar_one_or_none()
    if conversation is None:
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=message_text[:18] or "新对话",
            category="知识问答",
        )
        db.add(conversation)
    elif conversation.title == "新对话":
        conversation.title = message_text[:18] or "新对话"
    conversation.updated_at = datetime.now()
    db.add(Message(conversation_id=conversation.id, role="user", content=message_text))
    await db.commit()

    conversation_id = conversation.id
    conversation_title = conversation.title
    context = payload.context.model_dump() if payload.context is not None else None

    history_rows = list(
        (
            await db.execute(
                select(Message).where(Message.conversation_id == conversation_id).order_by(Message.id)
            )
        ).scalars()
    )
    history = [
        {"role": row.role, "content": row.content}
        for row in history_rows
        if row.role in {"user", "assistant"}
    ][-12:]

    async def event_stream():
        collected: list[str] = []
        yield _sse({"conversationId": conversation_id, "title": conversation_title})
        try:
            async for delta in llm_service.chat_stream(build_messages(history, context)):
                collected.append(delta)
                yield _sse({"delta": delta})
        except Exception as exc:  # 理论上 service 内部已降级，这里兜底
            yield _sse({"error": "生成回复时出错，请稍后重试", "detail": str(exc)})

        content = "".join(collected) or "（未生成内容）"
        # 流结束后用独立会话持久化助手回复
        async with SessionLocal() as session:
            message = Message(conversation_id=conversation_id, role="assistant", content=content)
            session.add(message)
            stored = (
                await session.execute(select(Conversation).where(Conversation.id == conversation_id))
            ).scalar_one()
            stored.updated_at = datetime.now()
            await session.commit()
            message_id = message.id

        yield _sse(
            {
                "done": True,
                "messageId": message_id,
                "conversationId": conversation_id,
                "title": conversation_title,
            }
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


EXPLAIN_PROMPT = (
    "请用通俗的中文向正在学习遥感的学生解释知识点「{title}」。"
    "要求：先给出一句话概括，再补充 2-3 个关键点，总字数 200 字以内。"
)


@router.post("/explain", response_model=ExplainResponse)
async def explain(
    payload: ExplainRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ExplainResponse:
    node = (
        await db.execute(select(LearningNode).where(LearningNode.id == payload.node_id))
    ).scalar_one_or_none()
    if node is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="学习节点不存在")

    if not llm_service.enabled:
        return ExplainResponse(explanation=node.explanation)

    text = await llm_service.chat([{"role": "user", "content": EXPLAIN_PROMPT.format(title=node.title)}])
    return ExplainResponse(explanation=text.strip() or node.explanation)
