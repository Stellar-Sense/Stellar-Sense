"""数据库引擎与会话（SQLAlchemy 2.0 async + aiomysql）。"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。"""

    # MySQL 不支持 RETURNING：在 await flush() 内取得数据库生成的时间等默认值，
    # 避免序列化新对象时隐式查询并触发 MissingGreenlet。
    __mapper_args__ = {"eager_defaults": True}


engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI 依赖：每个请求一个数据库会话。"""
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    """启动时建表（v1 简化方案，后续可引入 Alembic 迁移）。"""
    from app import models  # noqa: F401  确保所有模型注册到 Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    from app.models.adaptive import GraphRevision

    async with SessionLocal() as session:
        if await session.get(GraphRevision, 1) is None:
            session.add(GraphRevision(id=1, version=1))
            await session.commit()
