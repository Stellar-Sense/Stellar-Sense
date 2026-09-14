"""API 路由汇总。"""

from fastapi import APIRouter

from app.api import (
    admin_graph,
    ai,
    auth,
    dashboard,
    health,
    knowledge,
    learning,
    learning_events,
    path,
    user,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(learning.router, prefix="/learning", tags=["learning"])
api_router.include_router(path.router, prefix="/path", tags=["path"])
api_router.include_router(admin_graph.router, prefix="/admin/knowledge", tags=["admin"])
api_router.include_router(learning_events.router, prefix="/learning", tags=["learning-events"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
