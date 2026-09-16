"""独立 RAG Retrieval API；不依赖聊天或 LLM。"""

import logging

from fastapi import APIRouter, HTTPException, status

from app.rag.container import retrieval_service
from app.rag.index import IndexFormatError
from app.schemas.rag import RetrievalHitOut, RetrievalRequest, RetrievalResponse

router = APIRouter()
logger = logging.getLogger("stellar.rag")


@router.post("/retrieve", response_model=RetrievalResponse)
def retrieve(payload: RetrievalRequest) -> RetrievalResponse:
    try:
        hits = retrieval_service.retrieve(payload.query, top_k=payload.top_k, node_id=payload.node_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG 索引尚未建立，请先导入资料并构建索引",
        ) from exc
    except IndexFormatError as exc:
        logger.warning("RAG API could not load the index", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG 索引不可用：索引格式或内容无效",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return RetrievalResponse(
        query=payload.query,
        hits=[
            RetrievalHitOut(
                chunk_id=hit.chunk_id,
                node_id=hit.node_id,
                resource_name=hit.resource_name,
                section=hit.section,
                content=hit.content,
                score=hit.score,
            )
            for hit in hits
        ],
    )
