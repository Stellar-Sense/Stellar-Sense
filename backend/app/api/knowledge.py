"""知识图谱接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.knowledge import KnowledgeEdgeOut, KnowledgeGraphOut, KnowledgeNodeOut
from app.services.adaptive import lock_learner, plan_inputs
from app.services.path_rules import build_decision, expand_dependencies

router = APIRouter()


@router.get("/graph", response_model=KnowledgeGraphOut)
async def get_graph(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> KnowledgeGraphOut:
    await lock_learner(db, user.id)
    graph = await plan_inputs(db, user.id)
    prerequisites, expanded = expand_dependencies(graph["nodes"], graph["edges"])
    whole_path = build_decision({**graph, "goal": {**graph["goal"], "nodeIds": []}})
    completed = set(whole_path["completedNodeIds"])
    edges = [edge for edge in graph["edges"] if edge["relation"] == "prerequisite"]

    prereq_map: dict[str, list[str]] = {}
    for edge in edges:
        prereq_map.setdefault(edge["toId"], []).append(edge["fromId"])

    node_payload: list[KnowledgeNodeOut] = []
    for node in graph["nodes"]:
        descendants = expanded.get(node["id"], {node["id"]})
        states = [graph["states"].get(key, {}) for key in descendants]
        progress = round(sum(state.get("mastery", 0) for state in states) / len(states))
        status = (
            "mastered"
            if descendants <= completed
            else "learning"
            if any(state.get("evidenceCount") for state in states)
            else "unlearned"
        )
        node_payload.append(
            KnowledgeNodeOut(
                id=node["id"],
                name=node["name"],
                domain=node["domain"],
                status=status,
                x=node["x"],
                y=node["y"],
                prerequisites=sorted(prerequisites.get(node["id"], set())) or prereq_map.get(node["id"], []),
                duration=f"{node['minutes']} 分钟",
                description=node["description"],
                progress=progress,
                kind=node["kind"],
                difficulty=node["difficulty"],
            )
        )

    await db.commit()
    return KnowledgeGraphOut(
        nodes=node_payload,
        edges=[KnowledgeEdgeOut(from_=edge["fromId"], to=edge["toId"]) for edge in edges],
        domain_order=list(dict.fromkeys(node["domain"] for node in graph["nodes"])),
        revision=graph["revision"],
        relations=graph["edges"],
    )
