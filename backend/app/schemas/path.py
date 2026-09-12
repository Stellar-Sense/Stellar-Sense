"""学习路径响应模型。"""

from app.schemas.common import CamelModel


class PathStageOut(CamelModel):
    id: str
    title: str
    summary: str
    duration: str
    difficulty: str
    focus: str
    objective: str
    status: str
    learning_goal: str
    recommended_content: list[str]
    prerequisites: list[str]
    completion: int
    estimated_time: str
    detail: str


class InsightCardOut(CamelModel):
    label: str
    value: str


class PathInsightOut(CamelModel):
    cards: list[InsightCardOut]


class PathAnalysisOut(CamelModel):
    title: str
    subtitle: str
    badge: str
    momentum: str
    next_action: str


class PathPlanOut(CamelModel):
    stages: list[PathStageOut]
    insight: PathInsightOut
    analysis: PathAnalysisOut
