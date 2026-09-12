"""健康检查。"""

from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    database = "up"
    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception:  # pragma: no cover - 仅用于健康检查降级
        database = "down"
    return {
        "status": "ok",
        "database": database,
        "llm": "deepseek" if settings.llm_enabled else "mock",
    }
