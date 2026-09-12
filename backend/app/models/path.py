"""学习路径：路径方案与分析结果。"""

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class PathPlan(TimestampMixin, Base):
    __tablename__ = "path_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    # {cards: [{label, value}]}
    insight: Mapped[dict] = mapped_column(JSON, default=dict)
    # {title, subtitle, badge, momentum, nextAction}
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)


class PathStage(Base):
    __tablename__ = "path_stages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("path_plans.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(64))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(128))
    summary: Mapped[str] = mapped_column(String(255), default="")
    duration: Mapped[str] = mapped_column(String(32), default="")
    difficulty: Mapped[str] = mapped_column(String(32), default="")
    focus: Mapped[str] = mapped_column(String(128), default="")
    objective: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(16), default="locked")
    learning_goal: Mapped[str] = mapped_column(String(255), default="")
    recommended_content: Mapped[list] = mapped_column(JSON, default=list)
    prerequisites: Mapped[list] = mapped_column(JSON, default=list)
    completion: Mapped[int] = mapped_column(Integer, default=0)
    estimated_time: Mapped[str] = mapped_column(String(64), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
