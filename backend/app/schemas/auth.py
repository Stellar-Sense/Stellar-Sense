"""认证相关请求/响应模型。"""

import re

from pydantic import field_validator

from app.schemas.common import CamelModel
from app.schemas.learner_profile import LearnerProfileWrite

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginRequest(CamelModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _email_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("邮箱不能为空")
        return value


class RegisterRequest(CamelModel):
    email: str
    password: str
    learner_profile: LearnerProfileWrite

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("邮箱格式不正确")
        return email

    @field_validator("password")
    @classmethod
    def _password_length(cls, value: str) -> str:
        if len(value) < 7:
            raise ValueError("密码至少需要 7 位")
        return value


class AuthUserResponse(CamelModel):
    account_no: str
    email: str
    role: list[str]
    exp: int


class TokenResponse(AuthUserResponse):
    access_token: str


class ForgotPasswordRequest(CamelModel):
    email: str


class ForgotPasswordResponse(CamelModel):
    ok: bool = True
    # 仅开发环境返回，便于本地联调（正式环境不返回）
    dev_code: str | None = None


class VerifyOtpRequest(CamelModel):
    email: str | None = None
    code: str


class OkResponse(CamelModel):
    ok: bool = True
