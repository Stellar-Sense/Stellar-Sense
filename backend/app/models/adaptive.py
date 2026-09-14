"""自适应学习与图谱管理的增量表，不改动已有表结构。"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Administrator(TimestampMixin, Base):
    """独立管理员身份。只有本表中的用户可修改公共图谱。"""

    __tablename__ = "administrators"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class GraphRevision(Base):
    __tablename__ = "graph_revisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[int] = mapped_column(Integer, default=1)


class KnowledgeNodeSpec(Base):
    __tablename__ = "knowledge_node_specs"
    node_id: Mapped[str] = mapped_column(
        ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), primary_key=True
    )
    kind: Mapped[str] = mapped_column(String(24), default="concept")
    difficulty: Mapped[int] = mapped_column(Integer, default=1)


class KnowledgeEdgeSpec(Base):
    __tablename__ = "knowledge_edge_specs"
    edge_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_edges.id", ondelete="CASCADE"), primary_key=True
    )
    relation: Mapped[str] = mapped_column(String(24), default="prerequisite")
    reason: Mapped[str] = mapped_column(String(512), default="")


class GraphChange(Base):
    __tablename__ = "graph_changes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    version: Mapped[int] = mapped_column(Integer, unique=True)
    administrator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(64))
    detail: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LearningTask(TimestampMixin, Base):
    __tablename__ = "learning_tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(128))
    kind: Mapped[str] = mapped_column(String(24))
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    minutes: Mapped[int] = mapped_column(Integer, default=10)
    # 客观题答案 / 主观题量规与依据只在后端和管理员接口返回。
    configuration: Mapped[dict] = mapped_column(JSON)


class LearningGoal(TimestampMixin, Base):
    __tablename__ = "learning_goals"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    node_ids: Mapped[list] = mapped_column(JSON, default=list)
    daily_minutes: Mapped[int] = mapped_column(Integer, default=45)
    version: Mapped[int] = mapped_column(Integer, default=1)


class LearningEvent(Base):
    """原始提交只追加；评价另存，不覆盖原始作答。"""

    __tablename__ = "learning_events"
    __table_args__ = (UniqueConstraint("user_id", "request_id", name="uq_learning_event_request"),)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("knowledge_nodes.id"), index=True)
    request_id: Mapped[str] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(24))
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LearningEvaluation(Base):
    __tablename__ = "learning_evaluations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("learning_events.id"), unique=True)
    score: Mapped[int] = mapped_column(Integer)
    feedback: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(64))
    evidence: Mapped[dict] = mapped_column(JSON)
    rule_version: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LearnerState(TimestampMixin, Base):
    __tablename__ = "learner_states"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("knowledge_nodes.id"), primary_key=True)
    mastery: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[int] = mapped_column(Integer, default=0)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    last_event_id: Mapped[int | None] = mapped_column(ForeignKey("learning_events.id"), nullable=True)
    error_tags: Mapped[list] = mapped_column(JSON, default=list)


class StateChange(Base):
    __tablename__ = "learner_state_changes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("knowledge_nodes.id"))
    evaluation_id: Mapped[int] = mapped_column(ForeignKey("learning_evaluations.id"), unique=True)
    before: Mapped[dict] = mapped_column(JSON)
    after: Mapped[dict] = mapped_column(JSON)
    rule_version: Mapped[str] = mapped_column(String(32))


class PathDecision(Base):
    __tablename__ = "path_decisions"
    __table_args__ = (UniqueConstraint("user_id", "version", name="uq_path_decision_version"),)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    rule_version: Mapped[str] = mapped_column(String(32))
    trigger: Mapped[str] = mapped_column(String(128))
    signature: Mapped[str] = mapped_column(String(64))
    inputs: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)
    changes: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
