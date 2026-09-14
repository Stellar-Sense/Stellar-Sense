"""节点学习与学习记录接口。"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    LearningNode,
    User,
)
from app.schemas.learning import (
    CompleteNodeOut,
    LearningHistoryOut,
    LearningNodeDetailOut,
    LearningNodesOut,
)
from app.services import progress as progress_service

router = APIRouter()


def _groups(nodes: list[LearningNode], statuses: dict[str, str]) -> list[dict]:
    groups: dict[str, list[dict]] = {}
    for node in nodes:
        groups.setdefault(node.group_name, []).append(
            {"id": node.id, "label": node.title, "status": statuses.get(node.id, "todo")}
        )
    return [{"group": group, "items": items} for group, items in groups.items()]


async def _get_node_or_404(db: AsyncSession, node_id: str) -> LearningNode:
    node = (await db.execute(select(LearningNode).where(LearningNode.id == node_id))).scalar_one_or_none()
    if node is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="学习节点不存在")
    return node


@router.get("/nodes", response_model=LearningNodesOut)
async def list_nodes(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> LearningNodesOut:
    nodes, progress = await progress_service.load_learning_state(db, user.id)
    statuses, current_id = progress_service.learning_status_map(nodes, progress)
    return LearningNodesOut(
        groups=_groups(nodes, statuses),
        sequence=[node.id for node in nodes],
        current_node_id=current_id,
    )


@router.get("/nodes/{node_id}", response_model=LearningNodeDetailOut)
async def get_node(
    node_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LearningNodeDetailOut:
    node = await _get_node_or_404(db, node_id)
    nodes, progress = await progress_service.load_learning_state(db, user.id)
    statuses, _current_id = progress_service.learning_status_map(nodes, progress)
    row = progress.get(node_id)
    return LearningNodeDetailOut(
        id=node.id,
        title=node.title,
        breadcrumb=node.breadcrumb,
        summary=node.summary,
        progress=row.progress if row is not None else 0,
        duration=node.duration,
        objectives=list(node.objectives or []),
        methods=list(node.methods or []),
        concept=node.concept,
        case_title=node.case_title,
        case_summary=node.case_summary,
        explanation=node.explanation,
        status=statuses.get(node_id, "todo"),
    )


@router.post("/nodes/{node_id}/complete", response_model=CompleteNodeOut)
async def complete_node(
    node_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompleteNodeOut:
    await _get_node_or_404(db, node_id)
    nodes, progress = await progress_service.load_learning_state(db, user.id)
    if node_id not in progress or not progress[node_id].completed:
        raise HTTPException(409, "请完成节点学习评价；阅读或手动标记不能代替掌握证据")
    sequence = [node.id for node in nodes]
    await db.commit()

    statuses, current_id = progress_service.learning_status_map(nodes, progress)
    index = sequence.index(node_id)
    next_node_id = sequence[index + 1] if index + 1 < len(sequence) else None
    return CompleteNodeOut(
        node_id=node_id,
        status="done",
        next_node_id=next_node_id,
        groups=_groups(nodes, statuses),
        sequence=sequence,
        current_node_id=current_id,
    )


@router.get("/history", response_model=LearningHistoryOut)
async def learning_history(
    range_key: Literal["7d", "30d", "90d"] = Query("30d", alias="range"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LearningHistoryOut:
    payload = await progress_service.build_history(db, user.id, range_key)
    return LearningHistoryOut(**payload)
