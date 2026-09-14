"""种子脚本：uv --directory backend run python -m app.seed.run

幂等：重复执行不会产生重复数据（内容类数据按主键更新）。
"""

import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal, engine, init_db
from app.models import (
    Conversation,
    KnowledgeEdge,
    KnowledgeNode,
    KnowledgeNodeContent,
    LearningNode,
    LearningRecord,
    Message,
    PathPlan,
    PathStage,
    User,
    UserAccount,
    UserKnowledgeProgress,
    UserLearningProgress,
    UserPreference,
    UserProfile,
)
from app.seed import data
from app.services.security import hash_password

# 未完成节点的“最近学习时间”偏移（天），用于仪表盘“最近学习”排序
RECENT_UPDATE_OFFSETS = {
    "图像增强": 0,
    "遥感大模型": 1,
    "特征提取": 2,
    "目标检测": 3,
    "Transformer": 5,
    "CNN": 9,
    "Rasterio": 20,
}


async def _count(session: AsyncSession, model, *conditions) -> int:
    return (await session.execute(select(func.count()).select_from(model).where(*conditions))).scalar_one()


def _at(today: datetime, day_offset: int, time_str: str | None) -> datetime:
    if time_str:
        hour, minute = (int(part) for part in time_str.split(":"))
    else:
        hour, minute = 21, 0
    return today - timedelta(days=day_offset) + timedelta(hours=hour, minutes=minute)


async def seed_knowledge(session: AsyncSession) -> None:
    nodes = {node.id: node for node in (await session.execute(select(KnowledgeNode))).scalars()}
    for order, item in enumerate(data.KNOWLEDGE_NODES):
        node = nodes.get(item["id"])
        if node is None:
            node = KnowledgeNode(id=item["id"])
            session.add(node)
        node.name = item["name"]
        node.domain = item["domain"]
        node.x = item["x"]
        node.y = item["y"]
        node.duration = item["duration"]
        node.sort_order = order

    # 先落库节点，保证后续边与详情的外键约束可满足
    await session.flush()

    if await _count(session, KnowledgeEdge) == 0:
        for from_id, to_id in data.KNOWLEDGE_EDGES:
            session.add(KnowledgeEdge(from_id=from_id, to_id=to_id))

    contents = {
        content.node_id: content
        for content in (await session.execute(select(KnowledgeNodeContent))).scalars()
    }
    for node_id, (description, _progress) in data.NODE_DETAILS.items():
        content = contents.get(node_id)
        if content is None:
            session.add(KnowledgeNodeContent(node_id=node_id, description=description))
        else:
            content.description = description

    await session.flush()


async def seed_learning_nodes(session: AsyncSession) -> None:
    nodes = {node.id: node for node in (await session.execute(select(LearningNode))).scalars()}
    for order, item in enumerate(data.LEARNING_NODES):
        node = nodes.get(item["id"])
        if node is None:
            node = LearningNode(id=item["id"])
            session.add(node)
        node.group_name = item["group_name"]
        node.title = item["title"]
        node.breadcrumb = item["breadcrumb"]
        node.summary = item["summary"]
        node.duration = item["duration"]
        node.sort_order = order
        node.objectives = item["objectives"]
        node.methods = item["methods"]
        node.concept = item["concept"]
        node.case_title = item["case_title"]
        node.case_summary = item["case_summary"]
        node.explanation = item["explanation"]

    await session.flush()


async def get_or_create_demo_user(session: AsyncSession) -> User:
    user = (await session.execute(select(User).where(User.email == data.DEMO_EMAIL))).scalar_one_or_none()
    if user is None:
        user = User(
            account_no=data.DEMO_ACCOUNT_NO,
            email=data.DEMO_EMAIL,
            password_hash=hash_password(data.DEMO_PASSWORD),
            role=["user"],
        )
        session.add(user)
        await session.flush()

    if (
        await session.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    ).scalar_one_or_none() is None:
        session.add(
            UserProfile(
                user_id=user.id,
                username=data.DEMO_NAME,
                email=data.DEMO_EMAIL,
                bio="遥感方向学习者，正在系统学习遥感影像处理与深度学习。",
                urls=[{"value": "https://remote-sensing.ai"}],
            )
        )
    if (
        await session.execute(select(UserAccount).where(UserAccount.user_id == user.id))
    ).scalar_one_or_none() is None:
        session.add(UserAccount(user_id=user.id, name=data.DEMO_NAME, dob=None, language="zh-CN"))
    if (
        await session.execute(select(UserPreference).where(UserPreference.user_id == user.id))
    ).scalar_one_or_none() is None:
        session.add(
            UserPreference(
                user_id=user.id,
                type="all",
                mobile="",
                communication_emails=True,
                social_emails=True,
                marketing_emails=False,
                security_emails=True,
            )
        )
    await session.flush()
    return user


async def seed_user_knowledge_progress(session: AsyncSession, user: User) -> None:
    if await _count(session, UserKnowledgeProgress, UserKnowledgeProgress.user_id == user.id):
        return
    for item in data.KNOWLEDGE_NODES:
        status = item["status"]
        preset = data.NODE_DETAILS.get(item["id"])
        if preset is not None:
            progress = preset[1]
        elif status == "mastered":
            progress = 100
        elif status == "learning":
            progress = 55
        else:
            progress = 0
        session.add(
            UserKnowledgeProgress(user_id=user.id, node_id=item["id"], status=status, progress=progress)
        )
    await session.flush()


async def seed_user_learning_progress(session: AsyncSession, user: User) -> None:
    if await _count(session, UserLearningProgress, UserLearningProgress.user_id == user.id):
        return
    now = datetime.now()
    completed_count = sum(1 for item in data.LEARNING_NODES if item["completed"])
    for order, item in enumerate(data.LEARNING_NODES):
        completed = item["completed"]
        completed_at = now - timedelta(days=(completed_count - order) * 2 + 1) if completed else None
        if completed:
            updated_at = completed_at
        else:
            updated_at = now - timedelta(days=RECENT_UPDATE_OFFSETS.get(item["id"], 30))
        session.add(
            UserLearningProgress(
                user_id=user.id,
                node_id=item["id"],
                completed=completed,
                progress=item["progress"],
                completed_at=completed_at,
                updated_at=updated_at,
            )
        )
    await session.flush()


async def seed_path_plan(session: AsyncSession, user: User) -> None:
    plan = (await session.execute(select(PathPlan).where(PathPlan.user_id == user.id))).scalar_one_or_none()
    if plan is not None:
        return
    plan = PathPlan(
        user_id=user.id,
        version=1,
        insight={},
        analysis=dict(data.PATH_ANALYSIS_VARIANTS[0]),
    )
    session.add(plan)
    await session.flush()
    for order, stage in enumerate(data.PATH_STAGES):
        session.add(PathStage(plan_id=plan.id, sort_order=order, **stage))
    await session.flush()


def _build_record_rows(now: datetime) -> list[dict]:
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    rows: list[dict] = []

    for item in data.RECENT_SESSIONS:
        rows.append(
            {
                "title": item["title"],
                "category": item["category"],
                "duration_minutes": item["duration_minutes"],
                "score": item["score"],
                "studied_at": _at(today, item["day_offset"], item["time"]),
                "summary": item["summary"],
                "is_timeline": False,
                "timeline_tag": "",
            }
        )

    for item in data.TIMELINE_ENTRIES:
        rows.append(
            {
                "title": item["title"],
                "category": "时间线",
                "duration_minutes": 0,
                "score": 0,
                "studied_at": _at(today, item["day_offset"], item["time"]),
                "summary": item["summary"],
                "is_timeline": True,
                "timeline_tag": item["tag"],
            }
        )

    rng = random.Random(20260912)
    for day_offset in range(3, 14):
        for _ in range(2 if rng.random() < 0.35 else 1):
            title, category, summary = rng.choice(data.RECORD_POOL)
            rows.append(
                {
                    "title": title,
                    "category": category,
                    "duration_minutes": rng.randint(20, 70),
                    "score": rng.randint(72, 96),
                    "studied_at": today
                    - timedelta(days=day_offset)
                    + timedelta(hours=rng.randint(8, 21), minutes=rng.choice([0, 10, 15, 30, 45])),
                    "summary": summary,
                    "is_timeline": False,
                    "timeline_tag": "",
                }
            )

    day = 14
    while day < 90:
        title, category, summary = rng.choice(data.RECORD_POOL)
        rows.append(
            {
                "title": title,
                "category": category,
                "duration_minutes": rng.randint(20, 70),
                "score": rng.randint(72, 96),
                "studied_at": today
                - timedelta(days=day)
                + timedelta(hours=rng.randint(8, 21), minutes=rng.choice([0, 15, 30])),
                "summary": summary,
                "is_timeline": False,
                "timeline_tag": "",
            }
        )
        day += rng.choice([2, 3, 4])

    return rows


async def seed_learning_records(session: AsyncSession, user: User) -> None:
    if await _count(session, LearningRecord, LearningRecord.user_id == user.id):
        return
    for row in _build_record_rows(datetime.now()):
        session.add(LearningRecord(user_id=user.id, **row))
    await session.flush()


async def seed_conversations(session: AsyncSession, user: User) -> None:
    if await _count(session, Conversation, Conversation.user_id == user.id):
        return
    base = datetime.now() - timedelta(days=2)
    for index, item in enumerate(data.CONVERSATIONS):
        created_at = base + timedelta(hours=index)
        session.add(
            Conversation(
                id=item["id"],
                user_id=user.id,
                title=item["title"],
                category=item["category"],
                created_at=created_at,
                updated_at=created_at,
            )
        )
        for message_index, message in enumerate(item["messages"]):
            session.add(
                Message(
                    conversation_id=item["id"],
                    role=message["role"],
                    content=message["content"],
                    created_at=created_at + timedelta(minutes=message_index),
                )
            )
    await session.flush()


async def run_seed() -> None:
    await init_db()
    async with SessionLocal() as session:
        from app.models.adaptive import GraphRevision

        revision = await session.get(GraphRevision, 1, with_for_update=True)
        if revision is not None and revision.version == 1:
            await seed_knowledge(session)
            await seed_learning_nodes(session)
        user = await get_or_create_demo_user(session)
        if revision is not None and revision.version == 1:
            from app.seed.assessment import seed_assessments

            await seed_user_knowledge_progress(session, user)
            await seed_user_learning_progress(session, user)
            await seed_path_plan(session, user)
            await seed_learning_records(session, user)
            await seed_assessments(session)
        await seed_conversations(session, user)
        await session.commit()
    await engine.dispose()
    print("种子数据完成：演示账号 learner@remote-sensing.ai / stellar123")


if __name__ == "__main__":
    asyncio.run(run_seed())
