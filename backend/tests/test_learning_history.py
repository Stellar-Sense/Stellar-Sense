"""学习记录（GET /learning/history）区间语义的回归测试。

覆盖两处修复：
- 连续学习天数限定在当前查询区间内：此前用全量记录统计，7 天视图会显示
  「连续 20 天」这类超出窗口的结果。
- 90 天趋势按 6 桶切分（每桶 15 天），标签须为桶起始日期；此前标成「N 月」，
  会让人误以为按自然月聚合。
"""

from datetime import datetime, timedelta

import pytest

from app.models import LearningRecord
from app.services.progress import trend_label


def _stat(payload: dict, label: str) -> str:
    return next(item["value"] for item in payload["stats"] if item["label"] == label)


def test_trend_label_uses_bucket_start_date_for_quarter() -> None:
    """90 天区间每桶 15 天，标签必须落在日期上而不是自然月。"""
    assert trend_label(90, 0, datetime(2026, 6, 16)) == "6/16"
    assert trend_label(90, 5, datetime(2026, 9, 1)) == "9/1"


def test_trend_label_keeps_weekday_and_week_formats() -> None:
    """7 天按周几、30 天按周，保持原有可读性。"""
    assert trend_label(7, 0, datetime(2026, 9, 8)) == "周二"
    assert trend_label(30, 2, datetime(2026, 6, 16)) == "第 3 周"


@pytest.mark.asyncio
async def test_history_streak_is_bounded_by_range_and_quarter_labels_are_dates(api):
    client, headers, sessions = api
    now = datetime.now()
    async with sessions() as db:
        # 连续 20 天的学习记录：7 天视图的连续天数必须被限制在区间内
        for offset in range(20):
            db.add(
                LearningRecord(
                    user_id=3,
                    title=f"学习记录 {offset}",
                    category="测试课程",
                    duration_minutes=30,
                    score=90,
                    studied_at=now - timedelta(days=offset),
                    summary="",
                    is_timeline=False,
                    timeline_tag="",
                )
            )
        # 80 天前的里程碑：只在 90 天视图内可见
        db.add(
            LearningRecord(
                user_id=3,
                title="早期里程碑",
                category="时间线",
                duration_minutes=0,
                score=0,
                studied_at=now - timedelta(days=80),
                summary="",
                is_timeline=True,
                timeline_tag="里程碑",
            )
        )
        await db.commit()

    week = (await client.get("/api/learning/history?range=7d", headers=headers[3])).json()
    quarter = (await client.get("/api/learning/history?range=90d", headers=headers[3])).json()

    assert _stat(week, "连续学习") == "7 天"
    assert _stat(quarter, "连续学习") == "20 天"

    assert all("/" in point["label"] for point in quarter["trend"])
    assert not any(point["label"].endswith(" 月") for point in quarter["trend"])

    # 记录与时间线同样按区间过滤
    assert any(item["title"] == "早期里程碑" for item in quarter["timeline"])
    assert not any(item["title"] == "早期里程碑" for item in week["timeline"])
