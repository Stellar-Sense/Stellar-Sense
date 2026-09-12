"""知识图谱接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import KnowledgeEdge, User
from app.schemas.knowledge import KnowledgeEdgeOut, KnowledgeGraphOut, KnowledgeNodeOut
from app.services import progress as progress_service

router = APIRouter()


@router.get("/graph", response_model=KnowledgeGraphOut)
async def get_graph(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> KnowledgeGraphOut:
    nodes, rows, contents = await progress_service.load_knowledge_state(db, user.id)
    edges = list((await db.execute(select(KnowledgeEdge))).scalars())

    prereq_map: dict[str, list[str]] = {}
    for edge in edges:
        prereq_map.setdefault(edge.to_id, []).append(edge.from_id)

    node_payload: list[KnowledgeNodeOut] = []
    for node in nodes:
        row = rows.get(node.id)
        status = row.status if row is not None else "unlearned"
        description, node_progress = progress_service.knowledge_detail(node, row, contents.get(node.id))
        node_payload.append(
            KnowledgeNodeOut(
                id=node.id,
                name=node.name,
                domain=node.domain,
                status=status,
                x=node.x,
                y=node.y,
                prerequisites=prereq_map.get(node.id, []),
                duration=node.duration,
                description=description,
                progress=node_progress,
            )
        )

    return KnowledgeGraphOut(
        nodes=node_payload,
        edges=[KnowledgeEdgeOut(from_=edge.from_id, to=edge.to_id) for edge in edges],
        domain_order=progress_service.DOMAIN_ORDER,
    )
