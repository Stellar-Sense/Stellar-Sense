"""仪表盘响应模型。"""

from app.schemas.common import CamelModel


class StatCardOut(CamelModel):
    title: str
    value: str
    description: str


class PathNodeOut(CamelModel):
    title: str
    status: str


class RadarItemOut(CamelModel):
    subject: str
    value: int


class RecentItemOut(CamelModel):
    title: str
    description: str
    progress: int
    status: str
    icon_class: str
    fallback: str


class SuggestionOut(CamelModel):
    topic: str
    estimate: str


class DashboardSummaryOut(CamelModel):
    stats: list[StatCardOut]
    path: list[PathNodeOut]
    radar: list[RadarItemOut]
    recent: list[RecentItemOut]
    suggestion: SuggestionOut
    course_progress: int
