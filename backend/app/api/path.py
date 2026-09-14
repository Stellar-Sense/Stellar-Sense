"""目标、动态路径和冻结输入的版本回放。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import KnowledgeNode, User
from app.models.adaptive import PathDecision
from app.schemas.adaptive import GoalWrite
from app.services.adaptive import goal_for, lock_learner, recompute
from app.services.path_rules import RULE_VERSION, build_decision

router = APIRouter()


@router.get("/plan")
async def plan(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await lock_learner(db, user.id)
    result = await recompute(db, user.id, "读取时同步学习证据与图谱")
    await db.commit()
    return result


@router.put("/goal")
async def update_goal(
    payload: GoalWrite, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    await lock_learner(db, user.id)
    ids = set(await db.scalars(select(KnowledgeNode.id)))
    if any(key not in ids for key in payload.node_ids):
        raise HTTPException(422, "目标包含不存在的知识节点")
    goal = await goal_for(db, user.id)
    requested = sorted(set(payload.node_ids))
    if sorted(goal.node_ids) != requested or goal.daily_minutes != payload.daily_minutes:
        goal.node_ids, goal.daily_minutes = requested, payload.daily_minutes
        goal.version += 1
    result = await recompute(db, user.id, "学习目标或可用时间调整")
    await db.commit()
    return result


@router.post("/regenerate")
async def regenerate(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await lock_learner(db, user.id)
    result = await recompute(db, user.id, "学习者重新规划")
    await db.commit()
    return result


@router.get("/history")
async def history(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(
        select(PathDecision)
        .where(PathDecision.user_id == user.id)
        .order_by(PathDecision.version.desc())
        .limit(50)
    )
    return [
        {
            "version": row.version,
            "createdAt": row.created_at.isoformat(),
            "trigger": row.trigger,
            "changes": row.changes,
            "ruleVersion": row.rule_version,
        }
        for row in rows
    ]


@router.get("/history/{version}")
async def replay(version: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await db.scalar(
        select(PathDecision).where(PathDecision.user_id == user.id, PathDecision.version == version)
    )
    if row is None:
        raise HTTPException(404, "路径版本不存在")
    supported = row.rule_version == RULE_VERSION
    recalculated = build_decision(row.inputs) if supported else None
    return {
        "version": row.version,
        "createdAt": row.created_at.isoformat(),
        "ruleVersion": row.rule_version,
        "verified": recalculated == row.result if supported else None,
        "result": row.result,
        "goal": row.inputs["goal"],
        "graphRevision": row.inputs["revision"],
        "eventIds": row.inputs["eventIds"],
        "evaluationIds": row.inputs["evaluationIds"],
        "changes": row.changes,
        "trigger": row.trigger,
    }
