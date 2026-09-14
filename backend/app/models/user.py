"""用户、个人档案、账号设置与验证码。"""

from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, LargeBinary, String, func
from sqlalchemy.dialects.mysql import MEDIUMBLOB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_no: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[list] = mapped_column(JSON, default=lambda: ["user"])


class UserProfile(TimestampMixin, Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    bio: Mapped[str] = mapped_column(String(512), default="")
    urls: Mapped[list] = mapped_column(JSON, default=list)


class LearnerProfile(TimestampMixin, Base):
    __tablename__ = "learner_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)


class UserAvatar(Base):
    __tablename__ = "user_avatars"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    image: Mapped[bytes] = mapped_column(LargeBinary().with_variant(MEDIUMBLOB(), "mysql"))


class UserAccount(TimestampMixin, Base):
    __tablename__ = "user_accounts"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), default="")
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    language: Mapped[str] = mapped_column(String(32), default="zh-CN")


class UserPreference(TimestampMixin, Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    type: Mapped[str] = mapped_column(String(16), default="all")
    mobile: Mapped[str | None] = mapped_column(String(32), nullable=True)
    communication_emails: Mapped[bool] = mapped_column(Boolean, default=True)
    social_emails: Mapped[bool] = mapped_column(Boolean, default=True)
    marketing_emails: Mapped[bool] = mapped_column(Boolean, default=False)
    security_emails: Mapped[bool] = mapped_column(Boolean, default=True)


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    code: Mapped[str] = mapped_column(String(8))
    purpose: Mapped[str] = mapped_column(String(32), default="password_reset")
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
