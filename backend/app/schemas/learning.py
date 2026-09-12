"""节点学习与学习记录响应模型。"""

from app.schemas.common import CamelModel


class LearningNodeItemOut(CamelModel):
    id: str
    label: str
    status: str


class LearningGroupOut(CamelModel):
    group: str
    items: list[LearningNodeItemOut]


class LearningNodesOut(CamelModel):
    groups: list[LearningGroupOut]
    sequence: list[str]
    current_node_id: str | None


class LearningNodeDetailOut(CamelModel):
    id: str
    title: str
    breadcrumb: str
    summary: str
    progress: int
    duration: str
    objectives: list[str]
    methods: list[str]
    concept: str
    case_title: str
    case_summary: str
    explanation: str
    status: str


class CompleteNodeOut(LearningNodesOut):
    node_id: str
    status: str
    next_node_id: str | None


class TrendPointOut(CamelModel):
    label: str
    minutes: int
    mastery: int


class HistoryStatOut(CamelModel):
    label: str
    value: str
    detail: str


class HistoryRecordOut(CamelModel):
    id: int
    title: str
    category: str
    duration: str
    score: int
    timestamp: str
    summary: str


class TimelineItemOut(CamelModel):
    id: int
    title: str
    tag: str
    when: str
    description: str


class MasteryItemOut(CamelModel):
    name: str
    value: int


class LearningHistoryOut(CamelModel):
    stats: list[HistoryStatOut]
    trend: list[TrendPointOut]
    mastery: list[MasteryItemOut]
    records: list[HistoryRecordOut]
    timeline: list[TimelineItemOut]
