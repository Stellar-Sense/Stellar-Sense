"""管理员专用的知识节点、关系与评价任务管理。"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_administrator
from app.models import (
    KnowledgeEdge,
    KnowledgeNode,
    KnowledgeNodeContent,
    LearningNode,
    UserKnowledgeProgress,
    UserLearningProgress,
)
from app.models.adaptive import (
    Administrator,
    GraphChange,
    KnowledgeEdgeSpec,
    KnowledgeNodeSpec,
    LearningEvent,
    LearningGoal,
    LearningTask,
)
from app.schemas.adaptive import EdgeWrite, NodeWrite, TaskWrite
from app.services.graph import assert_acyclic, graph_snapshot, lock_graph, record_change

router = APIRouter(dependencies=[Depends(get_current_administrator)])


@router.get("/graph")
async def get_graph(db: AsyncSession = Depends(get_db)) -> dict:
    return await graph_snapshot(db)


@router.get("/changes")
async def changes(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = await db.scalars(select(GraphChange).order_by(GraphChange.version.desc()).limit(50))
    return [
        {
            "version": row.version,
            "action": row.action,
            "detail": row.detail,
            "administratorId": row.administrator_id,
            "createdAt": row.created_at.isoformat(),
        }
        for row in rows
    ]


async def write_node(db: AsyncSession, node: KnowledgeNode, payload: NodeWrite):
    node.name, node.domain = payload.name, payload.domain
    node.duration, node.x, node.y = f"{payload.minutes} 分钟", payload.x, payload.y
    await db.flush()
    spec = await db.get(KnowledgeNodeSpec, node.id)
    if spec is None:
        spec = KnowledgeNodeSpec(node_id=node.id)
        db.add(spec)
    spec.kind, spec.difficulty = payload.kind, payload.difficulty
    content = await db.get(KnowledgeNodeContent, node.id)
    if content is None:
        content = KnowledgeNodeContent(node_id=node.id)
        db.add(content)
    content.description = payload.description
    learning = await db.get(LearningNode, node.id)
    if learning is None:
        learning = LearningNode(id=node.id, sort_order=node.sort_order)
        db.add(learning)
    learning.title, learning.group_name = payload.name, payload.domain
    learning.duration, learning.summary = node.duration, payload.description
    learning.breadcrumb = f"{payload.domain} / {payload.name}"


@router.post("/nodes", status_code=201)
async def create_node(
    payload: NodeWrite,
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
) -> dict:
    revision = await lock_graph(db, payload.expected_revision)
    node = KnowledgeNode(id=str(uuid.uuid4()), name=payload.name, domain=payload.domain, sort_order=1000)
    db.add(node)
    await write_node(db, node, payload)
    result = await record_change(
        db, revision, admin.user_id, "创建节点", {"nodeId": node.id, "name": node.name}
    )
    return {**result, "id": node.id}


@router.put("/nodes/{node_id}")
async def update_node(
    node_id: str,
    payload: NodeWrite,
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
) -> dict:
    revision = await lock_graph(db, payload.expected_revision)
    node = await db.get(KnowledgeNode, node_id)
    if node is None:
        raise HTTPException(404, "节点不存在")
    await write_node(db, node, payload)
    return await record_change(
        db, revision, admin.user_id, "更新节点", payload.model_dump(exclude={"expected_revision"})
    )


@router.delete("/nodes/{node_id}")
async def delete_node(
    node_id: str,
    expected_revision: int = Query(alias="expectedRevision", ge=1),
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
):
    revision = await lock_graph(db, expected_revision)
    node = await db.get(KnowledgeNode, node_id)
    if node is None:
        raise HTTPException(404, "节点不存在")
    edge = await db.scalar(
        select(KnowledgeEdge.id)
        .where(or_(KnowledgeEdge.from_id == node_id, KnowledgeEdge.to_id == node_id))
        .limit(1)
    )
    if edge is not None:
        raise HTTPException(409, "请先移除该节点的关系，避免意外破坏其他节点的依赖")
    for model in (UserLearningProgress, UserKnowledgeProgress, LearningEvent):
        if await db.scalar(select(model.node_id).where(model.node_id == node_id).limit(1)) is not None:
            raise HTTPException(409, "节点已有学习记录，不能删除；可以修改内容")
    if any(node_id in goal.node_ids for goal in await db.scalars(select(LearningGoal))):
        raise HTTPException(409, "节点仍被学习目标引用，不能删除")
    for model in (LearningTask, KnowledgeNodeSpec, KnowledgeNodeContent):
        await db.execute(delete(model).where(model.node_id == node_id))
    await db.execute(delete(LearningNode).where(LearningNode.id == node_id))
    await db.delete(node)
    return await record_change(
        db, revision, admin.user_id, "删除节点", {"nodeId": node_id, "name": node.name}
    )


async def check_edge(db: AsyncSession, payload: EdgeWrite, exclude_id: int | None = None):
    graph = await graph_snapshot(db)
    ids = {node["id"] for node in graph["nodes"]}
    if payload.from_id not in ids or payload.to_id not in ids:
        raise HTTPException(422, "关系两端的节点必须存在")
    if payload.from_id == payload.to_id:
        raise HTTPException(422, "节点不能依赖或关联自身")
    edges = [edge for edge in graph["edges"] if edge["id"] != exclude_id]
    if any(
        (edge["fromId"], edge["toId"], edge["relation"]) == (payload.from_id, payload.to_id, payload.relation)
        for edge in edges
    ):
        raise HTTPException(409, "该关系已存在")
    edges.append(payload.model_dump(by_alias=True))
    try:
        assert_acyclic(ids, edges, "prerequisite")
        assert_acyclic(ids, edges, "contains")
        from app.services.path_rules import expand_dependencies

        expand_dependencies(graph["nodes"], edges)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None


@router.post("/edges", status_code=201)
async def create_edge(
    payload: EdgeWrite,
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
):
    revision = await lock_graph(db, payload.expected_revision)
    await check_edge(db, payload)
    edge = KnowledgeEdge(from_id=payload.from_id, to_id=payload.to_id)
    db.add(edge)
    await db.flush()
    db.add(KnowledgeEdgeSpec(edge_id=edge.id, relation=payload.relation, reason=payload.reason))
    return await record_change(
        db, revision, admin.user_id, "添加关系", payload.model_dump(exclude={"expected_revision"})
    )


@router.put("/edges/{edge_id}")
async def update_edge(
    edge_id: int,
    payload: EdgeWrite,
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
):
    revision = await lock_graph(db, payload.expected_revision)
    edge = await db.get(KnowledgeEdge, edge_id)
    if edge is None:
        raise HTTPException(404, "关系不存在")
    await check_edge(db, payload, edge_id)
    edge.from_id, edge.to_id = payload.from_id, payload.to_id
    spec = await db.get(KnowledgeEdgeSpec, edge_id)
    if spec is None:
        spec = KnowledgeEdgeSpec(edge_id=edge_id)
        db.add(spec)
    spec.relation, spec.reason = payload.relation, payload.reason
    return await record_change(
        db, revision, admin.user_id, "更新关系", payload.model_dump(exclude={"expected_revision"})
    )


@router.delete("/edges/{edge_id}")
async def delete_edge(
    edge_id: int,
    expected_revision: int = Query(alias="expectedRevision", ge=1),
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
):
    revision = await lock_graph(db, expected_revision)
    edge = await db.get(KnowledgeEdge, edge_id)
    if edge is None:
        raise HTTPException(404, "关系不存在")
    await db.execute(delete(KnowledgeEdgeSpec).where(KnowledgeEdgeSpec.edge_id == edge_id))
    await db.delete(edge)
    return await record_change(
        db, revision, admin.user_id, "删除关系", {"fromId": edge.from_id, "toId": edge.to_id}
    )


@router.get("/nodes/{node_id}/tasks")
async def tasks(node_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(
        select(LearningTask).where(LearningTask.node_id == node_id).order_by(LearningTask.id)
    )
    return [
        {
            "id": row.id,
            "title": row.title,
            "kind": row.kind,
            "difficulty": row.difficulty,
            "minutes": row.minutes,
            **row.configuration,
        }
        for row in rows
    ]


@router.post("/nodes/{node_id}/tasks", status_code=201)
async def create_task(
    node_id: str,
    payload: TaskWrite,
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
):
    revision = await lock_graph(db, payload.expected_revision)
    if await db.get(KnowledgeNode, node_id) is None:
        raise HTTPException(404, "节点不存在")
    task = LearningTask(
        id=str(uuid.uuid4()),
        node_id=node_id,
        title=payload.title,
        kind=payload.kind,
        difficulty=payload.difficulty,
        minutes=payload.minutes,
        configuration=payload.model_dump(
            by_alias=True, exclude={"expected_revision", "title", "kind", "difficulty", "minutes"}
        ),
    )
    db.add(task)
    return await record_change(
        db, revision, admin.user_id, "添加评价任务", {"nodeId": node_id, "title": task.title}
    )


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    expected_revision: int = Query(alias="expectedRevision", ge=1),
    admin: Administrator = Depends(get_current_administrator),
    db: AsyncSession = Depends(get_db),
):
    revision = await lock_graph(db, expected_revision)
    task = await db.get(LearningTask, task_id)
    if task is None:
        raise HTTPException(404, "任务不存在")
    await db.delete(task)
    return await record_change(
        db, revision, admin.user_id, "移除评价任务", {"taskId": task_id, "title": task.title}
    )
