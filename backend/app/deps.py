"""通用依赖：Bearer Token 解析与当前用户。"""

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.models.adaptive import Administrator
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
    # 结束认证读取的快照，业务在取得行锁后建立新的 MySQL 一致性快照。
    await db.commit()
    return AuthContext(user=user, payload=payload)


async def get_current_user(context: AuthContext = Depends(get_auth_context)) -> User:
    return context.user


async def get_current_administrator(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Administrator:
    administrator = await db.get(Administrator, user.id)
    if administrator is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="仅管理员可以管理公共知识星图")
    await db.commit()
    return administrator


async def effective_roles(db: AsyncSession, user: User) -> list[str]:
    roles = [role for role in (user.role or ["user"]) if role != "admin"]
    if await db.get(Administrator, user.id) is not None:
        roles.append("admin")
    return roles
