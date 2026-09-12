"""认证接口：登录 / 注册 / 当前用户 / 登出 / 找回密码（OTP）。"""

import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import AuthContext, get_auth_context
from app.models import OtpCode, User, UserAccount, UserPreference, UserProfile
from app.schemas.auth import (
    AuthUserResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    OkResponse,
    RegisterRequest,
    TokenResponse,
    VerifyOtpRequest,
)
from app.services.security import create_access_token, hash_password, verify_password

router = APIRouter()


def _token_response(user: User) -> TokenResponse:
    role = list(user.role or [])
    token, exp = create_access_token(user_id=user.id, account_no=user.account_no, email=user.email, role=role)
    return TokenResponse(account_no=user.account_no, email=user.email, role=role, exp=exp, access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = (
        await db.execute(select(User).where(User.email == payload.email.strip().lower()))
    ).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码不正确")
    return _token_response(user)


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="该邮箱已注册")

    user = User(
        account_no="",
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=["user"],
    )
    db.add(user)
    await db.flush()
    user.account_no = f"ACC{user.id:04d}"

    default_name = payload.email.split("@")[0]
    db.add(UserProfile(user_id=user.id, username=default_name, email=payload.email, bio="", urls=[]))
    db.add(UserAccount(user_id=user.id, name=default_name, dob=None, language="zh-CN"))
    db.add(UserPreference(user_id=user.id))
    await db.commit()
    return _token_response(user)


@router.get("/me", response_model=AuthUserResponse)
async def me(context: AuthContext = Depends(get_auth_context)) -> AuthUserResponse:
    user = context.user
    return AuthUserResponse(
        account_no=user.account_no,
        email=user.email,
        role=list(user.role or []),
        exp=int(context.payload.get("exp", 0)) * 1000,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> Response:
    # JWT 无状态：客户端清除本地令牌即可
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
) -> ForgotPasswordResponse:
    email = payload.email.strip().lower()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    dev_code: str | None = None
    if user is not None:
        code = f"{random.randint(0, 999999):06d}"
        db.add(
            OtpCode(
                email=email,
                code=code,
                purpose="password_reset",
                expires_at=datetime.now() + timedelta(minutes=10),
            )
        )
        await db.commit()
        print(f"[OTP] {email} 验证码：{code}（10 分钟内有效）")
        if settings.debug:
            dev_code = code
    # 无论邮箱是否存在都返回成功，避免账号枚举
    return ForgotPasswordResponse(ok=True, dev_code=dev_code)


@router.post("/verify-otp", response_model=OkResponse)
async def verify_otp(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)) -> OkResponse:
    query = select(OtpCode).where(
        OtpCode.used.is_(False),
        OtpCode.code == payload.code.strip(),
        OtpCode.expires_at >= datetime.now(),
    )
    if payload.email:
        query = query.where(OtpCode.email == payload.email.strip().lower())
    otp = (await db.execute(query.order_by(OtpCode.id.desc()))).scalars().first()
    if otp is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="验证码无效或已过期")
    otp.used = True
    await db.commit()
    return OkResponse()
