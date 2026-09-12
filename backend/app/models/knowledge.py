"""知识图谱：节点、依赖边、详情文案与用户进度。"""

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    domain: Mapped[str] = mapped_column(String(64), index=True)
    x: Mapped[float] = mapped_column(Float, default=50)
    y: Mapped[float] = mapped_column(Float, default=50)
    duration: Mapped[str] = mapped_column(String(32), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    from_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True
    )
    to_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True
    )


class KnowledgeNodeContent(TimestampMixin, Base):
    __tablename__ = "knowledge_node_contents"

    node_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), primary_key=True
    )
    description: Mapped[str] = mapped_column(Text, default="")


class UserKnowledgeProgress(TimestampMixin, Base):
    __tablename__ = "user_knowledge_progress"
    __table_args__ = (UniqueConstraint("user_id", "node_id", name="uq_user_knowledge"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(16), default="unlearned")
    progress: Mapped[int] = mapped_column(Integer, default=0)
