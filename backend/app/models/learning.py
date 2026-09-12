"""节点学习：学习节点内容、用户进度与学习记录。"""

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class LearningNode(Base):
    __tablename__ = "learning_nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    group_name: Mapped[str] = mapped_column(String(64), default="遥感影像处理")
    title: Mapped[str] = mapped_column(String(128))
    breadcrumb: Mapped[str] = mapped_column(String(128), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    duration: Mapped[str] = mapped_column(String(32), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    objectives: Mapped[list] = mapped_column(JSON, default=list)
    methods: Mapped[list] = mapped_column(JSON, default=list)
    concept: Mapped[str] = mapped_column(Text, default="")
    case_title: Mapped[str] = mapped_column(String(128), default="")
    case_summary: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")


class UserLearningProgress(TimestampMixin, Base):
    __tablename__ = "user_learning_progress"
    __table_args__ = (UniqueConstraint("user_id", "node_id", name="uq_user_learning"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("learning_nodes.id", ondelete="CASCADE"), index=True
    )
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class LearningRecord(Base):
    __tablename__ = "learning_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64), index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[int] = mapped_column(Integer, default=0)
    studied_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    is_timeline: Mapped[bool] = mapped_column(Boolean, default=False)
    timeline_tag: Mapped[str] = mapped_column(String(64), default="")
