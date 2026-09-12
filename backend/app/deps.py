"""通用依赖：Bearer Token 解析与当前用户。"""

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.services.security import decode_access_token


@dataclass
class AuthContext:
    user: User
    payload: dict


async def get_auth_context(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="登录已过期，请重新登录") from None

    user = (await db.execute(select(User).where(User.id == int(payload.get("sub", 0))))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="登录已过期，请重新登录")
    return AuthContext(user=user, payload=payload)


async def get_current_user(context: AuthContext = Depends(get_auth_context)) -> User:
    return context.user
