"""学习事件、状态、目标与路径版本的事务服务。"""

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeNode, LearningRecord, User, UserKnowledgeProgress, UserLearningProgress
from app.models.adaptive import (
    LearnerState,
    LearningEvaluation,
    LearningEvent,
    LearningGoal,
    LearningTask,
    PathDecision,
    StateChange,
)
from app.schemas.adaptive import EventWrite
from app.services.evaluator import evaluate_answer
from app.services.graph import graph_snapshot, public_task
from app.services.path_rules import (
    RULE_VERSION,
    RULES,
    build_decision,
    decision_changes,
    decision_signature,
    mastered,
    update_state,
)


async def lock_learner(db: AsyncSession, user_id: int):
    # 同一用户的目标、证据、状态和路径修改串行，避免双次计分与路径版本冲突。
    await db.execute(select(User).where(User.id == user_id).with_for_update())


async def goal_for(db: AsyncSession, user_id: int) -> LearningGoal:
    goal = await db.get(LearningGoal, user_id)
    if goal is None:
        goal = LearningGoal(user_id=user_id, node_ids=[], daily_minutes=45, version=1)
        db.add(goal)
        await db.flush()
    return goal


def state_payload(state: LearnerState | None) -> dict:
    return {
        "mastery": state.mastery if state else 0,
        "confidence": state.confidence if state else 0,
        "evidenceCount": state.evidence_count if state else 0,
        "errorTags": state.error_tags if state else [],
    }


async def plan_inputs(db: AsyncSession, user_id: int) -> dict:
    graph = await graph_snapshot(db)
    goal = await db.get(LearningGoal, user_id)
    states = {
        row.node_id: state_payload(row)
        for row in await db.scalars(select(LearnerState).where(LearnerState.user_id == user_id))
    }
    # 旧版完成按钮没有评价证据，保留旧记录，但不能作为新的先修解锁依据。
    now = datetime.now()
    events = list(
        await db.scalars(
            select(LearningEvent).where(LearningEvent.user_id == user_id).order_by(LearningEvent.id)
        )
    )
    evaluations = {
        row.event_id: row
        for row in await db.scalars(
            select(LearningEvaluation).join(LearningEvent).where(LearningEvent.user_id == user_id)
        )
    }
    recent: dict[str, dict] = {}
    recent_valid: dict[str, set[str]] = {}
    for event in events:
        if event.created_at < now - timedelta(days=RULES["reviewDays"]):
            continue
        activity = recent.setdefault(event.node_id, {"attempts": 0, "taskIds": [], "skipped": False})
        if event.kind == "answer":
            activity["attempts"] += 1
            activity["taskIds"].append(event.payload["taskId"])
            if event.id in evaluations:
                recent_valid.setdefault(event.node_id, set()).add(event.payload["taskId"])
        if event.kind in {"skip", "accept"}:
            activity["skipped"] = event.kind == "skip"
    for key, state in states.items():
        if len(recent_valid.get(key, set())) < 2:
            state["confidence"] = min(state["confidence"], 40)
    tasks = [public_task(task) for task in await db.scalars(select(LearningTask).order_by(LearningTask.id))]
    return {
        **graph,
        "states": states,
        "recent": recent,
        "tasks": tasks,
        "goal": {"nodeIds": list(goal.node_ids), "dailyMinutes": goal.daily_minutes, "version": goal.version}
        if goal
        else {"nodeIds": [], "dailyMinutes": 45, "version": 1},
        "rules": dict(RULES),
        "ruleVersion": RULE_VERSION,
        "asOf": now.isoformat(),
        "eventIds": [event.id for event in events],
        "evaluationIds": [row.id for row in evaluations.values()],
    }


async def recompute(db: AsyncSession, user_id: int, trigger: str) -> dict:
    await db.flush()
    inputs = await plan_inputs(db, user_id)
    try:
        result = build_decision(inputs)
    except (ValueError, KeyError) as exc:
        raise HTTPException(409, "图谱无法生成有效路径，请管理员检查依赖或目标节点：" + str(exc)) from None
    signature = decision_signature(result, inputs["goal"])
    latest = await db.scalar(
        select(PathDecision)
        .where(PathDecision.user_id == user_id)
        .order_by(PathDecision.version.desc())
        .limit(1)
    )
    changed = latest is None or latest.signature != signature
    if changed:
        latest = PathDecision(
            user_id=user_id,
            version=latest.version + 1 if latest else 1,
            rule_version=RULE_VERSION,
            trigger=trigger,
            signature=signature,
            inputs=inputs,
            result=result,
            changes=decision_changes(latest.result if latest else None, result),
        )
        db.add(latest)
        await db.flush()
    return {
        **result,
        "goal": inputs["goal"],
        "version": latest.version,
        "changed": changed,
        "ruleVersion": RULE_VERSION,
        "graphRevision": inputs["revision"],
        "changes": latest.changes if changed else [],
        "nodes": inputs["nodes"],
        "states": inputs["states"],
        "createdAt": latest.created_at.isoformat(),
    }


async def event_response(db: AsyncSession, event: LearningEvent) -> dict:
    evaluation = await db.scalar(select(LearningEvaluation).where(LearningEvaluation.event_id == event.id))
    state = await db.get(LearnerState, (event.user_id, event.node_id))
    return {
        "id": event.id,
        "nodeId": event.node_id,
        "kind": event.kind,
        "createdAt": event.created_at.isoformat(),
        "status": "evaluated" if evaluation else "pending" if event.kind == "answer" else "recorded",
        "score": evaluation.score if evaluation else None,
        "feedback": evaluation.feedback
        if evaluation
        else "作答已保存，等待真实模型评价；暂不更新掌握状态。"
        if event.kind == "answer"
        else "已记录；此行为不会提高掌握度。",
        "source": evaluation.source if evaluation else None,
        "state": state_payload(state),
        "answer": event.payload.get("answer", ""),
        "taskTitle": event.payload.get("task", {}).get("title", ""),
    }


async def submit_event(db: AsyncSession, user_id: int, payload: EventWrite) -> LearningEvent:
    await lock_learner(db, user_id)
    prior = await db.scalar(
        select(LearningEvent).where(
            LearningEvent.user_id == user_id, LearningEvent.request_id == payload.request_id
        )
    )
    original = payload.model_dump(by_alias=True)
    if prior:
        if prior.payload.get("request") != original:
            raise HTTPException(409, "相同请求编号不能用于不同事件")
        return prior
    if await db.get(KnowledgeNode, payload.node_id) is None:
        raise HTTPException(404, "知识节点不存在")
    data = {
        "request": original,
        "answer": payload.answer,
        "durationSeconds": payload.duration_seconds,
        "hintLevel": payload.hint_level,
        "taskId": payload.task_id,
    }
    if payload.kind == "answer":
        task = await db.get(LearningTask, payload.task_id)
        if task is None or task.node_id != payload.node_id:
            raise HTTPException(422, "评价任务不属于当前节点或已被移除")
        current = await recompute(db, user_id, "作答前检查先修条件")
        entry = next((row for row in current["entries"] if row["nodeId"] == payload.node_id), None)
        # 允许复习已掌握节点；目标以外节点按全图检查，不允许绕过先修提交。
        inputs = await plan_inputs(db, user_id)
        inputs["goal"] = {**inputs["goal"], "nodeIds": [payload.node_id]}
        node_path = build_decision(inputs)
        entry = next((row for row in node_path["entries"] if row["nodeId"] == payload.node_id), entry)
        if entry and entry["status"] == "blocked":
            raise HTTPException(409, "请先完成前置节点的学习评价，再提交当前任务")
        if task.kind == "quiz" and (
            not payload.answer.isdigit() or int(payload.answer) >= len(task.configuration["options"])
        ):
            raise HTTPException(422, "请选择一个有效选项")
        previous_answer = await db.scalar(
            select(LearningEvent.id)
            .where(
                LearningEvent.user_id == user_id,
                LearningEvent.node_id == payload.node_id,
                LearningEvent.kind == "answer",
            )
            .order_by(LearningEvent.id.desc())
            .limit(1)
        )
        hints = await db.scalars(
            select(LearningEvent).where(
                LearningEvent.user_id == user_id,
                LearningEvent.node_id == payload.node_id,
                LearningEvent.kind == "hint",
                LearningEvent.id > (previous_answer or 0),
            )
        )
        data["hintLevel"] = max([payload.hint_level, *(row.payload.get("hintLevel", 0) for row in hints)])
        data["task"] = {
            "id": task.id,
            "title": task.title,
            "kind": task.kind,
            "minutes": task.minutes,
            **task.configuration,
        }
    event = LearningEvent(
        user_id=user_id,
        node_id=payload.node_id,
        request_id=payload.request_id,
        kind=payload.kind,
        payload=data,
    )
    db.add(event)
    await db.flush()
    if payload.kind in {"skip", "accept"}:
        await recompute(db, user_id, "学习者跳过建议" if payload.kind == "skip" else "学习者接受建议")
    await db.commit()
    return event


async def grade_event(db: AsyncSession, event: LearningEvent) -> dict:
    if event.kind != "answer":
        return await event_response(db, event)
    existing = await db.scalar(select(LearningEvaluation).where(LearningEvaluation.event_id == event.id))
    if existing:
        return await event_response(db, event)
    task = event.payload["task"]
    # 网络评价前释放读事务；冻结的任务快照使重试不受管理员后续编辑影响。
    await db.commit()
    if task["kind"] == "quiz":
        correct = int(event.payload["answer"]) == task["answerIndex"]
        result = {
            "score": 100 if correct else 0,
            "source": "objective",
            "feedback": ("回答正确。" if correct else "回答尚需修正。")
            + task["reference"]
            + "\n依据："
            + task["source"],
            "evidence": {"answerIndex": task["answerIndex"], "reference": task["source"]},
            "errorTags": [] if correct else ["概念理解待巩固"],
        }
    else:
        result = await evaluate_answer(task, event.payload["answer"])
    if result is None:
        return await event_response(db, event)
    await lock_learner(db, event.user_id)
    existing = await db.scalar(select(LearningEvaluation).where(LearningEvaluation.event_id == event.id))
    if existing:
        return await event_response(db, event)
    state = await db.get(LearnerState, (event.user_id, event.node_id))
    before = state_payload(state)
    evaluation = LearningEvaluation(
        event_id=event.id,
        score=result["score"],
        feedback=result["feedback"],
        source=result["source"],
        evidence=result["evidence"],
        rule_version=RULE_VERSION,
    )
    db.add(evaluation)
    await db.flush()
    valid = list(
        await db.scalars(
            select(LearningEvent)
            .join(LearningEvaluation)
            .where(LearningEvent.user_id == event.user_id, LearningEvent.node_id == event.node_id)
        )
    )
    distinct = {row.payload["taskId"] for row in valid}
    recent = {row.payload["taskId"] for row in valid if row.created_at >= datetime.now() - timedelta(days=7)}
    after = update_state(
        before, result["score"], event.payload["hintLevel"], len(distinct), len(recent), result["errorTags"]
    )
    if state is None:
        state = LearnerState(user_id=event.user_id, node_id=event.node_id)
        db.add(state)
    state.mastery, state.confidence = after["mastery"], after["confidence"]
    state.evidence_count, state.error_tags, state.last_event_id = (
        after["evidenceCount"],
        after["errorTags"],
        event.id,
    )
    db.add(
        StateChange(
            user_id=event.user_id,
            node_id=event.node_id,
            evaluation_id=evaluation.id,
            before=before,
            after=after,
            rule_version=RULE_VERSION,
        )
    )
    learning = await db.scalar(
        select(UserLearningProgress).where(
            UserLearningProgress.user_id == event.user_id, UserLearningProgress.node_id == event.node_id
        )
    )
    if learning is None:
        learning = UserLearningProgress(user_id=event.user_id, node_id=event.node_id)
        db.add(learning)
    learning.progress, learning.completed = after["mastery"], mastered(after)
    learning.completed_at = datetime.now() if learning.completed else None
    knowledge = await db.scalar(
        select(UserKnowledgeProgress).where(
            UserKnowledgeProgress.user_id == event.user_id, UserKnowledgeProgress.node_id == event.node_id
        )
    )
    if knowledge is None:
        knowledge = UserKnowledgeProgress(user_id=event.user_id, node_id=event.node_id)
        db.add(knowledge)
    knowledge.progress = after["mastery"]
    knowledge.status = "mastered" if mastered(after) else "learning"
    db.add(
        LearningRecord(
            user_id=event.user_id,
            title=task["title"],
            category="学习评价",
            duration_minutes=round(event.payload["durationSeconds"] / 60),
            score=result["score"],
            studied_at=event.created_at,
            summary=result["feedback"],
            is_timeline=False,
        )
    )
    await recompute(db, event.user_id, "学习评价更新：" + task["title"][:70])
    await db.commit()
    return await event_response(db, event)
