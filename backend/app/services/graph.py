"""共享图谱读取、版本锁与依赖校验。"""

import re

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeEdge, KnowledgeNode, KnowledgeNodeContent
from app.models.adaptive import GraphChange, GraphRevision, KnowledgeEdgeSpec, KnowledgeNodeSpec, LearningTask


def assert_acyclic(node_ids: set[str], edges: list[dict], relation: str) -> None:
    outgoing: dict[str, list[str]] = {key: [] for key in node_ids}
    degree = dict.fromkeys(node_ids, 0)
    for edge in edges:
        if edge["relation"] != relation:
            continue
        source, target = edge["fromId"], edge["toId"]
        if source not in node_ids or target not in node_ids:
            raise ValueError("关系端点不存在")
        outgoing[source].append(target)
        degree[target] += 1
    queue = sorted(key for key, value in degree.items() if value == 0)
    for source in queue:
        for target in outgoing[source]:
            degree[target] -= 1
            if degree[target] == 0:
                queue.append(target)
    if len(queue) != len(node_ids):
        blocked = sorted(key for key, value in degree.items() if value)
        raise ValueError("存在循环依赖，请移除形成回路的关系：" + "、".join(blocked[:8]))


async def graph_snapshot(db: AsyncSession) -> dict:
    nodes = list(
        (await db.scalars(select(KnowledgeNode).order_by(KnowledgeNode.sort_order, KnowledgeNode.id))).all()
    )
    specs = {row.node_id: row for row in await db.scalars(select(KnowledgeNodeSpec))}
    descriptions = {row.node_id: row.description for row in await db.scalars(select(KnowledgeNodeContent))}
    edge_specs = {row.edge_id: row for row in await db.scalars(select(KnowledgeEdgeSpec))}
    revision = await db.get(GraphRevision, 1)
    edges = []
    for edge in await db.scalars(select(KnowledgeEdge).order_by(KnowledgeEdge.id)):
        spec = edge_specs.get(edge.id)
        edges.append(
            {
                "id": edge.id,
                "fromId": edge.from_id,
                "toId": edge.to_id,
                "relation": spec.relation if spec else "prerequisite",
                "reason": spec.reason if spec else "先修知识为后续学习提供基础（待管理员细化）",
            }
        )
    return {
        "revision": revision.version if revision else 1,
        "nodes": [
            {
                "id": node.id,
                "name": node.name,
                "domain": node.domain,
                "kind": specs[node.id].kind if node.id in specs else "concept",
                "difficulty": specs[node.id].difficulty if node.id in specs else 1,
                "minutes": int(match.group()) if (match := re.search(r"\d+", node.duration)) else 30,
                "description": descriptions.get(node.id, ""),
                "x": node.x,
                "y": node.y,
                "sortOrder": node.sort_order,
            }
            for node in nodes
        ],
        "edges": edges,
    }


async def lock_graph(db: AsyncSession, expected: int) -> GraphRevision:
    revision = await db.get(GraphRevision, 1, with_for_update=True, populate_existing=True)
    if revision is None:
        raise HTTPException(503, "图谱尚未初始化，请重启后端")
    if revision.version != expected:
        raise HTTPException(409, "图谱已被其他管理员更新，请刷新后重试")
    return revision


async def record_change(db: AsyncSession, revision: GraphRevision, admin_id: int, action: str, detail: dict):
    revision.version += 1
    db.add(GraphChange(version=revision.version, administrator_id=admin_id, action=action, detail=detail))
    await db.commit()
    return {"revision": revision.version}


def public_task(task: LearningTask) -> dict:
    config = task.configuration
    return {
        "id": task.id,
        "nodeId": task.node_id,
        "title": task.title,
        "kind": task.kind,
        "difficulty": task.difficulty,
        "minutes": task.minutes,
        "prompt": config["prompt"],
        "options": config.get("options", []),
        "source": config["source"],
    }
