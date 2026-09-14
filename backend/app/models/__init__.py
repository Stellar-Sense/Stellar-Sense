"""ORM 模型包：导入全部模型以注册到 Base.metadata。"""

from app.models import adaptive as adaptive
from app.models.adaptive import Administrator
from app.models.base import TimestampMixin
from app.models.chat import Conversation, Message
from app.models.knowledge import (
    KnowledgeEdge,
    KnowledgeNode,
    KnowledgeNodeContent,
    UserKnowledgeProgress,
)
from app.models.learning import LearningNode, LearningRecord, UserLearningProgress
from app.models.path import PathPlan, PathStage
from app.models.user import OtpCode, User, UserAccount, UserAvatar, UserPreference, UserProfile

__all__ = [
    "Administrator",
    "Conversation",
    "KnowledgeEdge",
    "KnowledgeNode",
    "KnowledgeNodeContent",
    "LearningNode",
    "LearningRecord",
    "Message",
    "OtpCode",
    "PathPlan",
    "PathStage",
    "TimestampMixin",
    "User",
    "UserAccount",
    "UserAvatar",
    "UserKnowledgeProgress",
    "UserLearningProgress",
    "UserPreference",
    "UserProfile",
]
