"""画像用于解释偏好和初始建议，不提供掌握证据，也不覆盖已保存目标。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import LearnerProfile
from app.schemas.learner_profile import CATALOG, LearnerProfileWrite


async def profile_for(db: AsyncSession, user_id: int) -> LearnerProfileWrite | None:
    row = await db.get(LearnerProfile, user_id)
    return LearnerProfileWrite.model_validate(row.payload) if row else None


def daily_minutes(profile: LearnerProfileWrite | None) -> int:
    value = profile.selections["time"][0] if profile else "unsure"
    return 45 if value == "unsure" else int(value)


async def guidance_context(db: AsyncSession, user_id: int, context: dict | None) -> dict:
    result = dict(context or {})
    # 不能信任客户端传入或旧会话缓存的画像；每次从当前账号重新读取。
    result.pop("learner_profile", None)
    profile = await profile_for(db, user_id)
    if profile:
        result["learner_profile"] = {
            group["title"]: [
                option["label"]
                for option in group["options"]
                if option["id"] in profile.selections[group["id"]]
            ]
            for group in CATALOG["groups"]
        }
    return result


def suggest_targets(profile: LearnerProfileWrite | None, nodes: list[dict]) -> dict | None:
    if profile is None:
        return None
    interests = next(group for group in CATALOG["groups"] if group["id"] == "interests")
    domains = [
        item["label"]
        for item in interests["options"]
        if item["id"] in profile.selections["interests"] and item["id"] != "unsure"
    ]
    introductory = bool(set(profile.selections["goals"]) & {"intro", "explore"})
    selected = []
    for domain in domains:
        candidates = sorted(
            [node for node in nodes if node["domain"] == domain],
            key=lambda node: (node.get("sortOrder", 0), node["id"]),
        )
        if not candidates:
            continue
        if introductory:
            selected.extend(node["id"] for node in candidates if node.get("difficulty", 1) == 1)
        else:
            courses = [node for node in candidates if node.get("kind") in {"direction", "course"}]
            selected.extend(node["id"] for node in (courses or candidates))
    return {
        "nodeIds": list(dict.fromkeys(selected))[:30],
        "dailyMinutes": daily_minutes(profile),
        "reason": "根据兴趣方向与学习目的推荐目标；采纳后仍会补齐先修，掌握度以学习评价为准。",
    }
