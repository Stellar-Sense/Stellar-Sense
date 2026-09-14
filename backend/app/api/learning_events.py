"""统一学习事件入口，客户端不能提交分数或直接设置掌握度。"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import KnowledgeNode, User
from app.models.adaptive import LearningEvent, LearningTask
from app.schemas.adaptive import EventWrite
from app.services.adaptive import event_response, grade_event, lock_learner, plan_inputs, submit_event
from app.services.graph import public_task
from app.services.path_rules import build_decision

router = APIRouter()


@router.get("/nodes/{node_id}/tasks")
async def tasks(node_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if await db.get(KnowledgeNode, node_id) is None:
        raise HTTPException(404, "节点不存在")
    await lock_learner(db, user.id)
    inputs = await plan_inputs(db, user.id)
    inputs["goal"]["nodeIds"] = [node_id]
    result = build_decision(inputs)
    entry = next((row for row in result["entries"] if row["nodeId"] == node_id), None)
    rows = await db.scalars(
        select(LearningTask)
        .where(LearningTask.node_id == node_id)
        .order_by(LearningTask.difficulty, LearningTask.id)
    )
    tasks = [public_task(task) for task in rows]
    await db.commit()
    return {
        "tasks": tasks,
        "state": inputs["states"].get(
            node_id, {"mastery": 0, "confidence": 0, "evidenceCount": 0, "errorTags": []}
        ),
        "blockers": entry["prerequisites"] if entry else [],
        "blockerNames": [
            node["name"] for node in inputs["nodes"] if entry and node["id"] in entry["prerequisites"]
        ],
    }


@router.post("/events")
async def record_event(
    payload: EventWrite, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    event = await submit_event(db, user.id, payload)
    return await grade_event(db, event)


@router.get("/events")
async def events(
    node_id: str | None = Query(default=None, alias="nodeId"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LearningEvent).where(LearningEvent.user_id == user.id)
    if node_id:
        query = query.where(LearningEvent.node_id == node_id)
    rows = await db.scalars(query.order_by(LearningEvent.id.desc()).limit(50))
    return [await event_response(db, event) for event in rows]


@router.post("/events/{event_id}/retry")
async def retry(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await db.scalar(
        select(LearningEvent).where(LearningEvent.id == event_id, LearningEvent.user_id == user.id)
    )
    if event is None:
        raise HTTPException(404, "学习事件不存在")
    return await grade_event(db, event)
