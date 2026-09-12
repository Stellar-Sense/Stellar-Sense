"""学习路径接口。"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import PathPlan, PathStage, User
from app.schemas.path import PathPlanOut
from app.seed import data as seed_data
from app.services import progress as progress_service
from app.services.llm import llm_service

router = APIRouter()

REGENERATE_PROMPT = (
    "你是遥感专业的自适应学习路径规划助手。请根据学生的当前学习数据，"
    "生成一段简短的学习路径分析。\n"
    "只输出 JSON（不要代码块、不要多余文字），字段如下：\n"
    '{"title": "...", "subtitle": "...", "badge": "...", "momentum": "...", "nextAction": "..."}\n'
    "- title：分析标题（8 字以内）\n"
    "- subtitle：结合进度的具体建议（60 字以内）\n"
    "- badge：2-4 字标签，例如“专属推荐”\n"
    '- momentum：提升幅度描述，例如 "+8% 专项提升"\n'
    "- nextAction：以“下一步：”开头的行动建议\n\n"
    "学生当前数据：\n{summary}"
)

_ANALYSIS_KEYS = ("title", "subtitle", "badge", "momentum", "nextAction")


def _parse_analysis(text: str) -> dict | None:
    """从 LLM 输出中提取分析 JSON；解析失败时返回 None 走降级逻辑。"""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or not all(key in data for key in _ANALYSIS_KEYS):
        return None
    return {key: str(data[key]) for key in _ANALYSIS_KEYS}


def _progress_summary(payload: dict) -> str:
    lines = [f"- {card['label']}：{card['value']}" for card in payload["insight"]["cards"]]
    for stage in payload["stages"]:
        if stage["status"] == "active":
            lines.append(f"- 当前阶段：{stage['title']}（完成度 {stage['completion']}%）")
            break
    return "\n".join(lines)


async def ensure_plan(db: AsyncSession, user: User) -> PathPlan:
    """读取当前用户的路径方案；不存在时用模板初始化（新注册用户）。"""
    plan = (await db.execute(select(PathPlan).where(PathPlan.user_id == user.id))).scalar_one_or_none()
    if plan is not None:
        return plan
    plan = PathPlan(
        user_id=user.id,
        version=1,
        insight={},
        analysis=dict(seed_data.PATH_ANALYSIS_VARIANTS[0]),
    )
    db.add(plan)
    await db.flush()
    for order, stage in enumerate(seed_data.PATH_STAGES):
        db.add(PathStage(plan_id=plan.id, sort_order=order, **stage))
    await db.commit()
    return plan


@router.get("/plan", response_model=PathPlanOut)
async def get_plan(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> PathPlanOut:
    await ensure_plan(db, user)
    payload = await progress_service.build_path_plan_out(db, user.id)
    return PathPlanOut(**payload)


@router.post("/regenerate", response_model=PathPlanOut)
async def regenerate(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> PathPlanOut:
    """按最新学习进度重排阶段，并生成新的路径分析（配置 LLM 时由模型生成，否则轮换预置文案）。"""
    plan = await ensure_plan(db, user)
    plan.version += 1

    payload = await progress_service.build_path_plan_out(db, user.id)
    analysis: dict | None = None
    if llm_service.enabled:
        text = await llm_service.chat(
            [
                {
                    "role": "user",
                    "content": REGENERATE_PROMPT.format(summary=_progress_summary(payload)),
                }
            ]
        )
        analysis = _parse_analysis(text)
    if analysis is None:
        variants = seed_data.PATH_ANALYSIS_VARIANTS
        analysis = dict(variants[(plan.version - 1) % len(variants)])

    plan.analysis = analysis
    await db.commit()
    payload = await progress_service.build_path_plan_out(db, user.id)
    return PathPlanOut(**payload)
