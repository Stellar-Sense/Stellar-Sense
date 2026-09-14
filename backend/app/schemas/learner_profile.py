"""注册与个人设置共用的画像契约；标签目录由前后端共享。"""

import json
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import CamelModel

CATALOG = json.loads(
    (Path(__file__).resolve().parents[3] / "shared" / "learner-profile.json").read_text(encoding="utf-8")
)


class LearnerProfileWrite(CamelModel):
    version: Literal[1] = 1
    selections: dict[str, list[str]] = Field(max_length=8)

    @model_validator(mode="after")
    def validate_selections(self):
        if set(self.selections) != {group["id"] for group in CATALOG["groups"]}:
            raise ValueError("请完成全部六轮个人画像选择")
        for group in CATALOG["groups"]:
            values = self.selections[group["id"]]
            allowed = {option["id"] for option in group["options"]}
            if not 1 <= len(values) <= group["max"] or len(set(values)) != len(values):
                raise ValueError(f"{group['title']}的选择数量不符合要求")
            if not set(values) <= allowed:
                raise ValueError(f"{group['title']}包含未知标签")
            if group["exclusive"] in values and len(values) != 1:
                raise ValueError(f"{group['title']}的未确定选项不能与其他标签同时选择")
        return self


class LearnerProfileOut(CamelModel):
    profile: LearnerProfileWrite | None = None
