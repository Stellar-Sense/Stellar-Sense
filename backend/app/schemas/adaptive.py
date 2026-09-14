"""图谱维护和学习事件的严格输入契约。"""

from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import CamelModel


class RevisionRequest(CamelModel):
    expected_revision: int = Field(ge=1)


class NodeWrite(RevisionRequest):
    name: str = Field(min_length=1, max_length=128)
    domain: str = Field(min_length=1, max_length=64)
    kind: Literal["direction", "course", "concept", "method", "tool"] = "concept"
    difficulty: int = Field(default=1, ge=1, le=3)
    minutes: int = Field(default=30, ge=1, le=600)
    description: str = Field(default="", max_length=20000)
    x: float = Field(default=50, ge=0, le=100, allow_inf_nan=False)
    y: float = Field(default=50, ge=0, le=100, allow_inf_nan=False)

    @model_validator(mode="after")
    def clean_labels(self):
        self.name, self.domain = self.name.strip(), self.domain.strip()
        if not self.name or not self.domain:
            raise ValueError("名称与领域不能为空")
        return self


class EdgeWrite(RevisionRequest):
    from_id: str = Field(min_length=1, max_length=64)
    to_id: str = Field(min_length=1, max_length=64)
    relation: Literal["prerequisite", "contains", "applies", "related"] = "prerequisite"
    reason: str = Field(min_length=1, max_length=512)

    @model_validator(mode="after")
    def clean_reason(self):
        self.reason = self.reason.strip()
        if not self.reason:
            raise ValueError("请说明关系成立的原因")
        return self


class TaskWrite(RevisionRequest):
    title: str = Field(min_length=1, max_length=128)
    kind: Literal["quiz", "explanation"]
    difficulty: int = Field(default=1, ge=1, le=3)
    minutes: int = Field(default=10, ge=1, le=180)
    prompt: str = Field(min_length=1, max_length=5000)
    options: list[str] = Field(default_factory=list, max_length=8)
    answer_index: int | None = Field(default=None, ge=0, le=7)
    reference: str = Field(min_length=1, max_length=10000)
    source: str = Field(min_length=1, max_length=1000)
    rubric: str = Field(default="概念准确性、推理过程、适用条件，各项按 0—100 分评价。", max_length=3000)

    @model_validator(mode="after")
    def validate_task(self):
        if not all(
            value.strip() for value in [self.title, self.prompt, self.reference, self.source, self.rubric]
        ):
            raise ValueError("题目、依据、来源及量规不能为空")
        if self.kind == "quiz" and (
            len(self.options) < 2
            or self.answer_index is None
            or self.answer_index >= len(self.options)
            or any(not option.strip() or len(option) > 1000 for option in self.options)
        ):
            raise ValueError("客观题至少需要两个非空选项及有效答案索引")
        return self


class GoalWrite(CamelModel):
    node_ids: list[str] = Field(max_length=30)
    daily_minutes: int = Field(ge=10, le=480)


class EventWrite(CamelModel):
    request_id: str = Field(min_length=8, max_length=64)
    node_id: str = Field(min_length=1, max_length=64)
    kind: Literal["read", "hint", "accept", "skip", "answer"]
    task_id: str | None = Field(default=None, max_length=36)
    answer: str = Field(default="", max_length=12000)
    duration_seconds: int = Field(default=0, ge=0, le=28800)
    hint_level: int = Field(default=0, ge=0, le=3)

    @model_validator(mode="after")
    def require_answer(self):
        if self.kind == "answer" and (not self.task_id or not self.answer.strip()):
            raise ValueError("作答事件必须包含题目编号和答案")
        return self
