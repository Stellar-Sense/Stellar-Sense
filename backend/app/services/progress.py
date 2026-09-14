"""学习进度计算：状态推导、掌握度、历史趋势、路径与仪表盘聚合。"""

import math
import re
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    KnowledgeNode,
    KnowledgeNodeContent,
    LearningNode,
    LearningRecord,
    PathPlan,
    PathStage,
    UserKnowledgeProgress,
    UserLearningProgress,
)
from app.seed import data as seed_data

DOMAIN_ORDER: list[str] = list(seed_data.DOMAIN_ORDER)

# 雷达图科目 → 学习节点映射
RADAR_SUBJECTS: list[tuple[str, list[str]]] = [
    ("遥感基础", ["遥感概论", "电磁波与遥感", "遥感成像原理", "遥感传感器"]),
    ("Python", ["Python 基础", "NumPy", "Pandas"]),
    ("数据处理", ["GDAL", "Rasterio"]),
    ("影像处理", ["影像预处理", "几何校正", "辐射校正", "图像增强", "特征提取"]),
    ("深度学习", ["CNN", "目标检测"]),
    ("Transformer", ["Transformer"]),
    ("大模型", ["遥感大模型"]),
]

# 学习记录页“知识掌握度”卡片 → 学习节点映射
MASTERY_SUBJECTS: list[tuple[str, str]] = [
    ("图像增强", "图像增强"),
    ("特征提取", "特征提取"),
    ("目标检测", "目标检测"),
    ("Transformer", "Transformer"),
    ("大模型应用", "遥感大模型"),
]

DOMAIN_ICON_CLASS: dict[str, str] = {
    "遥感基础": "text-sky-200 bg-sky-500/15",
    "Python 数据处理": "text-cyan-200 bg-cyan-500/15",
    "遥感影像处理": "text-amber-200 bg-amber-500/15",
    "深度学习": "text-violet-200 bg-violet-500/15",
    "Transformer": "text-pink-200 bg-pink-500/15",
    "遥感大模型": "text-emerald-200 bg-emerald-500/15",
}

_STAGE_DONE_THRESHOLD = 85
_MINUTES_RE = re.compile(r"(\d+)")
_RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}


def parse_minutes(text: str) -> int:
    match = _MINUTES_RE.search(text or "")
    return int(match.group(1)) if match else 30


def trend_label(days: int, index: int, start: datetime) -> str:
    """学习趋势分桶标签：7 天按周几、30 天按周、90 天按桶起始日期。

    90 天区间按 6 桶切分（每桶 15 天），原先标为「N 月」会让人误以为按自然月聚合。
    """
    if days == 7:
        return f"周{'一二三四五六日'[start.weekday()]}"
    if days == 30:
        return f"第 {index + 1} 周"
    return f"{start.month}/{start.day}"


def relative_time(value: datetime, now: datetime | None = None) -> str:
    now = now or datetime.now()
    delta_days = (now.date() - value.date()).days
    if delta_days <= 0:
        return f"今天 {value:%H:%M}"
    if delta_days == 1:
        return f"昨天 {value:%H:%M}"
    if delta_days < 7:
        return f"{delta_days} 天前"
    if delta_days < 30:
        return f"{delta_days // 7} 周前"
    return f"{value.month} 月 {value.day} 日"


async def load_learning_state(
    db: AsyncSession, user_id: int
) -> tuple[list[LearningNode], dict[str, UserLearningProgress]]:
    from app.models.adaptive import LearnerState
    from app.services.adaptive import plan_inputs
    from app.services.path_rules import build_decision, expand_dependencies

    nodes = list((await db.execute(select(LearningNode).order_by(LearningNode.sort_order))).scalars())
    inputs = await plan_inputs(db, user_id)
    selected_path = build_decision(inputs)
    all_inputs = {**inputs, "goal": {**inputs["goal"], "nodeIds": []}}
    whole_path = build_decision(all_inputs)
    completed = set(whole_path["completedNodeIds"])
    _, expanded = expand_dependencies(inputs["nodes"], inputs["edges"])
    state_rows = {
        row.node_id: row
        for row in await db.scalars(select(LearnerState).where(LearnerState.user_id == user_id))
    }
    preferred = [row["nodeId"] for row in selected_path["entries"]]
    rank = {key: index for index, key in enumerate(preferred)}
    nodes.sort(
        key=lambda node: (
            0 if node.id in completed else 1,
            rank.get(node.id, len(rank) + node.sort_order),
            node.id,
        )
    )
    progress = {}
    for node in nodes:
        descendants = expanded.get(node.id, {node.id})
        value = round(
            sum(inputs["states"].get(key, {}).get("mastery", 0) for key in descendants) / len(descendants)
        )
        touched = [state_rows[key].updated_at for key in descendants if key in state_rows]
        progress[node.id] = UserLearningProgress(
            user_id=user_id,
            node_id=node.id,
            progress=value,
            completed=descendants <= completed,
            updated_at=max(touched) if touched else datetime.min,
        )
    return nodes, progress


def learning_status_map(
    nodes: list[LearningNode], progress: dict[str, UserLearningProgress]
) -> tuple[dict[str, str], str | None]:
    """推导 done / current / todo 状态；current 为首个未完成节点。"""
    first_incomplete: str | None = None
    for node in nodes:
        row = progress.get(node.id)
        if row is None or not row.completed:
            first_incomplete = node.id
            break
    statuses: dict[str, str] = {}
    for node in nodes:
        row = progress.get(node.id)
        if row is not None and row.completed:
            statuses[node.id] = "done"
        elif node.id == first_incomplete:
            statuses[node.id] = "current"
        else:
            statuses[node.id] = "todo"
    return statuses, first_incomplete


def node_progress_map(nodes: list[LearningNode], progress: dict[str, UserLearningProgress]) -> dict[str, int]:
    return {node.id: (progress[node.id].progress if node.id in progress else 0) for node in nodes}


def overall_mastery(progress_by_node: dict[str, int]) -> int:
    if not progress_by_node:
        return 0
    return round(sum(progress_by_node.values()) / len(progress_by_node))


def _average(values: list[int]) -> int:
    return round(sum(values) / len(values)) if values else 0


async def load_knowledge_state(
    db: AsyncSession, user_id: int
) -> tuple[
    list[KnowledgeNode],
    dict[str, UserKnowledgeProgress],
    dict[str, str],
]:
    nodes = list((await db.execute(select(KnowledgeNode).order_by(KnowledgeNode.sort_order))).scalars())
    rows = list(
        (
            await db.execute(select(UserKnowledgeProgress).where(UserKnowledgeProgress.user_id == user_id))
        ).scalars()
    )
    contents = {
        content.node_id: content.description
        for content in (await db.execute(select(KnowledgeNodeContent))).scalars()
    }
    return nodes, {row.node_id: row for row in rows}, contents


def knowledge_detail(
    node: KnowledgeNode,
    row: UserKnowledgeProgress | None,
    description: str | None,
) -> tuple[str, int]:
    status = row.status if row is not None else "unlearned"
    if description:
        progress = row.progress if row is not None else 0
        return description, progress
    if status == "mastered":
        return f"{node.name} 是当前学习路径中已经建立的关键知识点。", (
            row.progress if row is not None else 100
        )
    if status == "learning":
        return f"{node.name} 正处于学习阶段，适合深入理解与持续实践。", (
            row.progress if row is not None else 55
        )
    return f"{node.name} 是 {node.domain} 中尚未开始学习的核心知识节点。", 0


# ---------------------------------------------------------------- 学习历史


async def build_history(db: AsyncSession, user_id: int, range_key: str) -> dict:
    days = _RANGE_DAYS[range_key]
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    range_start = today - timedelta(days=days - 1)
    prev_start = range_start - timedelta(days=days)

    records = list(
        (
            await db.execute(
                select(LearningRecord)
                .where(LearningRecord.user_id == user_id)
                .order_by(LearningRecord.studied_at.desc())
            )
        ).scalars()
    )
    nodes, progress = await load_learning_state(db, user_id)
    progress_by_node = node_progress_map(nodes, progress)
    overall = overall_mastery(progress_by_node)

    in_range = [record for record in records if record.studied_at >= range_start]
    previous = [record for record in records if prev_start <= record.studied_at < range_start]
    total_minutes = sum(record.duration_minutes for record in in_range)
    prev_minutes = sum(record.duration_minutes for record in previous)

    # 趋势分桶
    bucket_count = 7 if days == 7 else 5 if days == 30 else 6
    bucket_days = days // bucket_count
    buckets: list[tuple[datetime, datetime]] = []
    labels: list[str] = []
    for index in range(bucket_count):
        start = range_start + timedelta(days=index * bucket_days)
        end = (
            range_start + timedelta(days=(index + 1) * bucket_days)
            if index < bucket_count - 1
            else today + timedelta(days=1)
        )
        buckets.append((start, end))
        labels.append(trend_label(days, index, start))

    trend: list[dict] = []
    last_mastery: int | None = None
    for (start, end), label in zip(buckets, labels, strict=True):
        bucket_records = [record for record in records if start <= record.studied_at < end]
        minutes = sum(record.duration_minutes for record in bucket_records)
        scores = [record.score for record in bucket_records if not record.is_timeline]
        if scores:
            mastery = round(sum(scores) / len(scores))
        else:
            mastery = last_mastery if last_mastery is not None else overall
        last_mastery = mastery
        trend.append({"label": label, "minutes": minutes, "mastery": mastery})

    # 连续学习天数（限定在当前查询区间内，避免 7 天视图出现超过 7 天的连续天数）
    studied_days = {record.studied_at.date() for record in in_range}
    cursor = now.date()
    if cursor not in studied_days:
        cursor -= timedelta(days=1)
    streak = 0
    while cursor in studied_days:
        streak += 1
        cursor -= timedelta(days=1)

    completed = sum(1 for node in nodes if (row := progress.get(node.id)) is not None and row.completed)
    completion_rate = round(completed / len(nodes) * 100) if nodes else 0
    delta = round((total_minutes - prev_minutes) / prev_minutes * 100) if prev_minutes else None

    stats = [
        {
            "label": "学习时长",
            "value": f"{total_minutes / 60:.1f}h",
            "detail": f"较上一周期 {delta:+d}%" if delta is not None else "保持稳定",
        },
        {"label": "完成率", "value": f"{completion_rate}%", "detail": "整体进度稳定"},
        {"label": "连续学习", "value": f"{streak} 天", "detail": "保持高效节奏"},
        {"label": "知识掌握", "value": f"{overall}%", "detail": "持续积累中"},
    ]

    recent_records = [record for record in in_range if not record.is_timeline][:5]
    timeline_records = [record for record in in_range if record.is_timeline][:6]

    return {
        "stats": stats,
        "trend": trend,
        "mastery": [
            {
                "name": label,
                "value": progress[node_id].progress if node_id in progress else 0,
            }
            for label, node_id in MASTERY_SUBJECTS
        ],
        "records": [
            {
                "id": record.id,
                "title": record.title,
                "category": record.category,
                "duration": f"{record.duration_minutes} 分钟",
                "score": record.score,
                "timestamp": relative_time(record.studied_at, now),
                "summary": record.summary,
            }
            for record in recent_records
        ],
        "timeline": [
            {
                "id": record.id,
                "title": record.title,
                "tag": record.timeline_tag,
                "when": relative_time(record.studied_at, now),
                "description": record.summary,
            }
            for record in timeline_records
        ],
    }


# ---------------------------------------------------------------- 学习路径


def stage_completions(progress_by_node: dict[str, int]) -> dict[str, int]:
    return {
        key: _average([progress_by_node.get(node_id, 0) for node_id in node_ids])
        for key, node_ids in seed_data.STAGE_NODE_MAP.items()
    }


def stage_status_map(completions: dict[str, int]) -> dict[str, str]:
    statuses: dict[str, str] = {}
    active_assigned = False
    for stage in seed_data.PATH_STAGES:
        key = stage["key"]
        completion = completions.get(key, 0)
        if completion >= _STAGE_DONE_THRESHOLD:
            statuses[key] = "done"
        elif not active_assigned:
            statuses[key] = "active"
            active_assigned = True
        else:
            statuses[key] = "locked"
    return statuses


def stage_title(key: str) -> str:
    for stage in seed_data.PATH_STAGES:
        if stage["key"] == key:
            return str(stage["title"])
    return key


async def estimate_days_to_finish(
    db: AsyncSession, user_id: int, nodes: list[LearningNode], progress_by_node: dict[str, int]
) -> int | None:
    now = datetime.now()
    window_start = now - timedelta(days=14)
    records = list(
        (
            await db.execute(
                select(LearningRecord).where(
                    LearningRecord.user_id == user_id,
                    LearningRecord.studied_at >= window_start,
                )
            )
        ).scalars()
    )
    daily_minutes = sum(record.duration_minutes for record in records) / 14
    if daily_minutes <= 0:
        return None
    remaining = sum(
        parse_minutes(node.duration) * (1 - progress_by_node.get(node.id, 0) / 100) for node in nodes
    )
    if remaining <= 0:
        return 0
    return math.ceil(remaining / daily_minutes)


async def build_path_plan_out(db: AsyncSession, user_id: int) -> dict:
    plan = (await db.execute(select(PathPlan).where(PathPlan.user_id == user_id))).scalar_one_or_none()
    nodes, progress = await load_learning_state(db, user_id)
    progress_by_node = node_progress_map(nodes, progress)
    completions = stage_completions(progress_by_node)
    statuses = stage_status_map(completions)

    stages: list[dict] = []
    if plan is not None:
        rows = list(
            (
                await db.execute(
                    select(PathStage).where(PathStage.plan_id == plan.id).order_by(PathStage.sort_order)
                )
            ).scalars()
        )
        for row in rows:
            stages.append(
                {
                    "id": row.key,
                    "title": row.title,
                    "summary": row.summary,
                    "duration": row.duration,
                    "difficulty": row.difficulty,
                    "focus": row.focus,
                    "objective": row.objective,
                    "status": statuses.get(row.key, row.status),
                    "learning_goal": row.learning_goal,
                    "recommended_content": list(row.recommended_content or []),
                    "prerequisites": list(row.prerequisites or []),
                    "completion": completions.get(row.key, row.completion),
                    "estimated_time": row.estimated_time,
                    "detail": row.detail,
                }
            )

    overall = overall_mastery(progress_by_node)
    now = datetime.now()
    week_start = now - timedelta(days=7)
    week_records = list(
        (
            await db.execute(
                select(LearningRecord).where(
                    LearningRecord.user_id == user_id,
                    LearningRecord.studied_at >= week_start,
                    LearningRecord.is_timeline.is_(False),
                )
            )
        ).scalars()
    )
    days_estimate = await estimate_days_to_finish(db, user_id, nodes, progress_by_node)

    insight = {
        "cards": [
            {"label": "当前掌握度", "value": f"{overall}%"},
            {"label": "本周产出", "value": f"{len(week_records)} 项任务"},
            {"label": "预计完成", "value": f"{days_estimate} 天" if days_estimate else "—"},
        ]
    }
    analysis = (
        dict(plan.analysis)
        if plan is not None and plan.analysis
        else dict(seed_data.PATH_ANALYSIS_VARIANTS[0])
    )
    analysis.setdefault("next_action", "")

    return {"stages": stages, "insight": insight, "analysis": analysis}


# ---------------------------------------------------------------- 仪表盘


async def build_dashboard(db: AsyncSession, user_id: int) -> dict:
    from app.services.adaptive import plan_inputs
    from app.services.path_rules import build_decision

    inputs = await plan_inputs(db, user_id)
    adaptive_path = build_decision(inputs)
    nodes, progress = await load_learning_state(db, user_id)
    statuses, current_id = learning_status_map(nodes, progress)
    progress_by_node = node_progress_map(nodes, progress)
    overall = overall_mastery(progress_by_node)

    knowledge_nodes, knowledge_rows, _contents = await load_knowledge_state(db, user_id)
    domain_of_node = {node.id: node.domain for node in knowledge_nodes}

    records = list(
        (
            await db.execute(
                select(LearningRecord).where(
                    LearningRecord.user_id == user_id, LearningRecord.is_timeline.is_(False)
                )
            )
        ).scalars()
    )
    now = datetime.now()
    week_scores = [r.score for r in records if r.studied_at >= now - timedelta(days=7)]
    prev_scores = [
        r.score for r in records if now - timedelta(days=14) <= r.studied_at < now - timedelta(days=7)
    ]
    score_delta = (
        round(sum(week_scores) / len(week_scores) - sum(prev_scores) / len(prev_scores))
        if week_scores and prev_scores
        else None
    )

    next_node = next((node for node in nodes if node.id == adaptive_path["nextNodeId"]), None)
    active_stage_title = domain_of_node.get(next_node.id, "自主学习") if next_node else "当前目标已完成"

    completed_count = sum(1 for node in nodes if (row := progress.get(node.id)) is not None and row.completed)
    studied_days = {record.studied_at.date() for record in records}

    stats = [
        {"title": "学习天数", "value": f"{len(studied_days)} 天", "description": "持续学习中"},
        {
            "title": "已完成节点",
            "value": f"{completed_count} / {len(nodes)}",
            "description": "知识节点",
        },
        {
            "title": "学科掌握度",
            "value": f"{overall}%",
            "description": f"较上周 {score_delta:+d}%" if score_delta is not None else "保持稳定",
        },
        {
            "title": "当前学习阶段",
            "value": active_stage_title,
            "description": f"建议继续学习 {next_node.title}" if next_node else "继续保持",
        },
    ]

    # 路径节点（按领域顺序，当前节点所在领域标记为 current）
    current_domain = domain_of_node.get(next_node.id) if next_node else None
    path_nodes: list[dict] = []
    domains = list(dict.fromkeys(node["domain"] for node in inputs["nodes"]))
    for domain in domains:
        domain_ids = [node.id for node in nodes if domain_of_node.get(node.id) == domain]
        if domain_ids and all(progress[key].completed for key in domain_ids):
            status = "completed"
        elif domain == current_domain:
            status = "current"
        else:
            status = "upcoming"
        path_nodes.append({"title": domain, "status": status})

    radar = [
        {
            "subject": domain,
            "value": _average(
                [progress_by_node.get(node.id, 0) for node in nodes if domain_of_node.get(node.id) == domain]
            ),
        }
        for domain in domains
    ]

    # 最近学习：按更新时间倒序取 4 个有进度的节点
    touched = [
        row
        for row in sorted(progress.values(), key=lambda item: item.updated_at or datetime.min, reverse=True)
        if row.progress > 0 or row.completed
    ][:4]
    node_map = {node.id: node for node in nodes}
    recent: list[dict] = []
    for row in touched:
        node = node_map.get(row.node_id)
        if node is None:
            continue
        domain = domain_of_node.get(node.id, "遥感影像处理")
        letters = "".join(char for char in node.id if char.isascii() and char.isalnum())
        fallback = letters[:3].upper() if letters else node.id[:2]
        recent.append(
            {
                "title": node.title,
                "description": " · ".join(list(node.methods or [])[:2]) or node.breadcrumb,
                "progress": row.progress,
                "status": "已完成" if row.completed else "进行中",
                "icon_class": DOMAIN_ICON_CLASS.get(domain, "text-sky-200 bg-sky-500/15"),
                "fallback": fallback,
            }
        )

    suggestion = {
        "topic": next_node.title if next_node else "复习已完成的节点",
        "estimate": next_node.duration if next_node else "30 分钟",
    }

    return {
        "stats": stats,
        "path": path_nodes,
        "radar": radar,
        "recent": recent,
        "suggestion": suggestion,
        "course_progress": round(
            len(adaptive_path["completedNodeIds"])
            / max(len(adaptive_path["completedNodeIds"]) + len(adaptive_path["entries"]), 1)
            * 100
        ),
    }
