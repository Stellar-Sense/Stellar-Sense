"""由服务器维护者授予独立管理员身份：python -m app.admin EMAIL [--revoke]。"""

import argparse
import asyncio

from sqlalchemy import select

from app.database import SessionLocal, engine, init_db
from app.models import User
from app.models.adaptive import Administrator


async def manage(email: str, revoke: bool) -> None:
    await init_db()
    try:
        async with SessionLocal() as db:
            user = (
                await db.execute(select(User).where(User.email == email.strip().lower()))
            ).scalar_one_or_none()
            if user is None:
                raise SystemExit("用户不存在，请先通过注册页面创建账号。")
            administrator = await db.get(Administrator, user.id)
            if revoke and administrator:
                await db.delete(administrator)
            elif not revoke and administrator is None:
                db.add(Administrator(user_id=user.id))
            await db.commit()
            print("管理员身份已撤销" if revoke else "管理员身份已授予，请重新登录")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email")
    parser.add_argument("--revoke", action="store_true")
    args = parser.parse_args()
    asyncio.run(manage(args.email, args.revoke))
