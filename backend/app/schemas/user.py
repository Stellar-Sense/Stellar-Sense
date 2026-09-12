"""设置页（个人资料 / 账号 / 通知偏好）响应模型。"""

from datetime import date

from app.schemas.common import CamelModel


class UrlItemOut(CamelModel):
    value: str


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
    language: str


class PreferencesOut(CamelModel):
    type: str
    mobile: str | None = None
    communication_emails: bool = True
    social_emails: bool = True
    marketing_emails: bool = False
    security_emails: bool = True


class PreferencesUpdate(PreferencesOut):
    pass
