"""仪表盘接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.dashboard import DashboardSummaryOut
from app.services import progress as progress_service

router = APIRouter()


@router.get("/summary", response_model=DashboardSummaryOut)
async def summary(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> DashboardSummaryOut:
    payload = await progress_service.build_dashboard(db, user.id)
    return DashboardSummaryOut(**payload)
