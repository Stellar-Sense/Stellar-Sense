"""使用隔离 SQLite 数据库，不连接或修改开发者的 MySQL。"""

import httpx
import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import KnowledgeEdge, KnowledgeNode, KnowledgeNodeContent, LearningNode, User
from app.models.adaptive import Administrator, GraphRevision, LearningTask
from app.services.security import create_access_token, hash_password


@pytest_asyncio.fixture(params=[True, False], ids=["returning", "mysql-style-defaults"])
async def api(monkeypatch, request):
    monkeypatch.setattr(settings, "llm_api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "isolated-test-secret-at-least-thirty-two-characters")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    # MySQL 不支持 INSERT/UPDATE RETURNING，默认时间字段不会随写入自动返回。
    # 两种模式均覆盖，防止仅在 SQLite 上通过却在 MySQL 上发生隐式异步读取。
    engine.sync_engine.dialect.insert_returning = request.param
    engine.sync_engine.dialect.update_returning = request.param

    @event.listens_for(engine.sync_engine, "connect")
    def foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
    async with sessions() as db:
        for user_id in (1, 2, 3):
            db.add(
                User(
                    id=user_id,
                    account_no=f"TEST{user_id}",
                    email=f"user{user_id}@example.test",
                    password_hash=hash_password("test-password"),
                    role=["admin"] if user_id == 2 else ["user"],
                )
            )
        await db.flush()
        db.add(Administrator(user_id=1))
        db.add(GraphRevision(id=1, version=1))
        for order, key in enumerate(("a", "b", "c")):
            db.add(
                KnowledgeNode(
                    id=key, name=key.upper(), domain="测试课程", duration="20 分钟", sort_order=order
                )
            )
            db.add(
                LearningNode(
                    id=key, title=key.upper(), group_name="测试课程", duration="20 分钟", sort_order=order
                )
            )
        await db.flush()
        for key in ("a", "b", "c"):
            db.add(KnowledgeNodeContent(node_id=key, description=f"{key} 的内容"))
            for number in (1, 2):
                db.add(
                    LearningTask(
                        id=f"{key}{number}",
                        node_id=key,
                        title=f"{key} 题目 {number}",
                        kind="quiz",
                        difficulty=number,
                        minutes=10,
                        configuration={
                            "prompt": "选择正确项",
                            "options": ["正确", "错误"],
                            "answerIndex": 0,
                            "reference": "参考解释",
                            "source": "测试课程第1节",
                            "rubric": "答案正确性",
                        },
                    )
                )
        db.add(KnowledgeEdge(from_id="a", to_id="b"))
        db.add(KnowledgeEdge(from_id="b", to_id="c"))
        await db.commit()

    async def override_db():
        async with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    tokens = {
        user_id: create_access_token(
            user_id=user_id, account_no=f"TEST{user_id}", email=f"user{user_id}@example.test", role=["admin"]
        )[0]
        for user_id in (1, 2, 3)
    }
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client, {key: {"Authorization": f"Bearer {token}"} for key, token in tokens.items()}, sessions
    app.dependency_overrides.clear()
    await engine.dispose()
