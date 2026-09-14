"""设置页（个人资料 / 账号 / 通知偏好）响应模型。"""

from datetime import date
from typing import Literal

from pydantic import field_validator

from app.schemas.common import CamelModel


class UrlItemOut(CamelModel):
    value: str


class AvatarOut(CamelModel):
    data_url: str | None = None


class ProfileOut(CamelModel):
    username: str
    email: str
    bio: str
    urls: list[UrlItemOut]


class ProfileUpdate(CamelModel):
    username: str
    email: str
    bio: str
    urls: list[UrlItemOut] | None = None


class AccountOut(CamelModel):
    name: str
    dob: date | None = None
    language: str


class AccountUpdate(CamelModel):
    name: str
    dob: date | None = None
    language: Literal['zh', 'en']

    @field_validator('language', mode='before')
    @classmethod
    def normalize_language(cls, value: str) -> str:
        # Accept regional values saved by earlier clients.
        return value.lower().replace('_', '-').split('-')[0] if isinstance(value, str) else value


class PreferencesOut(CamelModel):
    type: str
    mobile: str | None = None
    communication_emails: bool = True
    social_emails: bool = True
    marketing_emails: bool = False
    security_emails: bool = True


class PreferencesUpdate(PreferencesOut):
    pass
