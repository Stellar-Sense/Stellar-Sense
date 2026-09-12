"""密码哈希与 JWT 令牌。"""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import settings

_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    raw = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:_BCRYPT_MAX_BYTES], password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(*, user_id: int, account_no: str, email: str, role: list[str]) -> tuple[str, int]:
    """返回 (token, 毫秒级过期时间戳)。前端 AuthUser.exp 使用毫秒。"""
    now = datetime.now(UTC)
    expires_at = now + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": str(user_id),
        "accountNo": account_no,
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int(expires_at.timestamp() * 1000)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
