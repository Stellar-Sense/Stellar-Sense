"""可回放的确定性路径规则；模型文本不能决定解锁。"""

import hashlib
import json
from collections import defaultdict

from app.services.graph import assert_acyclic

RULE_VERSION = "adaptive-v1"
RULES = {
    "masteryThreshold": 80,
    "confidenceThreshold": 60,
    "reviewDays": 7,
    "goalWeight": 5,
    "gapWeight": 3,
    "errorWeight": 2,
    "continuityWeight": 1,
    "repeatPenalty": 0.5,
    "skipPenalty": 3,
    "updateWeight": 0.3,
    "hintDiscount": 0.9,
}


def expand_dependencies(
    nodes: list[dict], edges: list[dict]
) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    ids = {node["id"] for node in nodes}
    assert_acyclic(ids, edges, "contains")
    assert_acyclic(ids, edges, "prerequisite")
    children: dict[str, set[str]] = defaultdict(set)
    for edge in edges:
        if edge["relation"] == "contains":
            children[edge["fromId"]].add(edge["toId"])
    expanded: dict[str, set[str]] = {}

    def leaves(key: str) -> set[str]:
        if key not in expanded:
            expanded[key] = (
                set().union(*(leaves(child) for child in sorted(children[key]))) if children[key] else {key}
            )
        return expanded[key]

    for key in sorted(ids):
        leaves(key)
    parents: dict[str, set[str]] = {key: set() for key in ids if not children[key]}
    for edge in edges:
        if edge["relation"] == "prerequisite":
            for source in leaves(edge["fromId"]):
                for target in leaves(edge["toId"]):
                    parents[target].add(source)
    flat = [
        {"fromId": source, "toId": target, "relation": "prerequisite"}
        for target, sources in parents.items()
        for source in sources
    ]
    assert_acyclic(set(parents), flat, "prerequisite")
    return parents, expanded


def mastered(state: dict, rules: dict = RULES) -> bool:
    return (
        state.get("mastery", 0) >= rules["masteryThreshold"]
        and state.get("confidence", 0) >= rules["confidenceThreshold"]
    )


def update_state(
    before: dict,
    score: int,
    hint_level: int,
    distinct_tasks: int,
    recent_tasks: int,
    errors: list[str],
    rules: dict = RULES,
) -> dict:
    effective = score * (rules["hintDiscount"] if hint_level >= 2 else 1)
    # 首次有效测量建立基线；后续按版本化权重平滑，至少两道不同题目的近期证据才能解锁。
    value = (
        effective
        if not before.get("evidenceCount")
        else ((1 - rules["updateWeight"]) * before["mastery"] + rules["updateWeight"] * effective)
    )
    confidence = min(95, distinct_tasks * 30)
    if recent_tasks < 2:
        confidence = min(confidence, 40)
    return {
        "mastery": round(value),
        "confidence": confidence,
        "evidenceCount": before.get("evidenceCount", 0) + 1,
        "errorTags": errors,
    }


def build_decision(inputs: dict) -> dict:
    rules = inputs.get("rules", RULES)
    nodes = {node["id"]: node for node in inputs["nodes"]}
    parents, expanded = expand_dependencies(inputs["nodes"], inputs["edges"])
    states, recent = inputs["states"], inputs.get("recent", {})
    requested = inputs["goal"]["nodeIds"]
    targets = set().union(*(expanded[key] for key in requested)) if requested else set(parents)
    relevant = set(targets)
    queue = sorted(targets)
    for key in queue:
        for parent in sorted(parents[key]):
            if parent not in relevant:
                relevant.add(parent)
                queue.append(parent)
    satisfied: set[str] = set()
    remaining = set(relevant)
    while remaining:
        progressed = {
            key for key in remaining if parents[key] <= satisfied and mastered(states.get(key, {}), rules)
        }
        if not progressed:
            break
        satisfied.update(progressed)
        remaining.difference_update(progressed)

    daily = inputs["goal"]["dailyMinutes"]
    tasks: dict[str, list[dict]] = defaultdict(list)
    for task in inputs.get("tasks", []):
        tasks[task["nodeId"]].append(task)
    priority: dict[str, float] = {}
    for key in relevant:
        state, activity = states.get(key, {}), recent.get(key, {})
        priority[key] = round(
            rules["goalWeight"] * (1 if key in targets else 0.8)
            + rules["gapWeight"] * (1 - state.get("mastery", 0) / 100)
            + rules["errorWeight"] * min(len(state.get("errorTags", [])), 2)
            + rules["continuityWeight"] * bool(activity.get("attempts"))
            - nodes[key]["minutes"] / 60
            - rules["repeatPenalty"] * activity.get("attempts", 0)
            - rules["skipPenalty"] * bool(activity.get("skipped")),
            4,
        )
    ordered: list[str] = []
    pending = relevant - satisfied
    scheduled = set(satisfied)
    while pending:
        choices = [key for key in pending if parents[key] <= scheduled]
        if not choices:
            raise ValueError("无法生成路径，请管理员检查图谱依赖")
        key = min(choices, key=lambda value: (-priority[value], nodes[value]["sortOrder"], value))
        ordered.append(key)
        scheduled.add(key)
        pending.remove(key)

    # 已有证据但近期不足的节点保留在补学链中，显示复习而不是新学。
    day, used = 1, 0
    entries = []
    for key in ordered:
        node, state, activity = nodes[key], states.get(key, {}), recent.get(key, {})
        blockers = sorted(parents[key] - satisfied)
        desired = 1 if state.get("mastery", 0) < 40 else 2 if state.get("mastery", 0) < 80 else 3
        candidates = [task for task in tasks[key] if task["minutes"] <= daily]
        attempted = set(activity.get("taskIds", []))
        task = (
            min(
                candidates,
                key=lambda item: (item["id"] in attempted, abs(item["difficulty"] - desired), item["id"]),
            )
            if candidates
            else None
        )
        minutes = max(
            task["minutes"] if task else 5,
            round(node["minutes"] * max(0.25, 1 - state.get("mastery", 0) / 100)),
        )
        sessions = []
        # 阅读可分段，单次评价任务必须能完整放入一个学习时段。
        assessment_minutes = task["minutes"] if task else 0
        left = minutes - assessment_minutes
        while left:
            if used == daily:
                day, used = day + 1, 0
            chunk = min(left, daily - used)
            sessions.append({"day": day, "minutes": chunk})
            left, used = left - chunk, used + chunk
        if assessment_minutes:
            if used + assessment_minutes > daily:
                day, used = day + 1, 0
            if sessions and sessions[-1]["day"] == day:
                sessions[-1]["minutes"] += assessment_minutes
            else:
                sessions.append({"day": day, "minutes": assessment_minutes})
            used += assessment_minutes
        reason = ["目标知识" if key in targets else "目标所需的补学节点"]
        if blockers:
            reason.append("先完成：" + "、".join(nodes[parent]["name"] for parent in blockers))
        else:
            reason.append("先修条件已满足，可立即学习")
        for edge in inputs["edges"]:
            if edge["relation"] == "prerequisite" and key in expanded[edge["toId"]] and edge.get("reason"):
                reason.append(f"先修依据：{edge['reason']}")
        if state.get("errorTags"):
            reason.append("重点修正：" + "、".join(state["errorTags"]))
        if state.get("evidenceCount", 0) and state.get("confidence", 0) < rules["confidenceThreshold"]:
            reason.append("需要近期不同题目的证据确认掌握情况")
        if activity.get("skipped"):
            reason.append("已记录跳过偏好；必要先修不会因此解锁")
        if task is None:
            reason.append("当前时间预算内无评价任务，可阅读；掌握确认需配置任务或增加时间")
        entries.append(
            {
                "nodeId": key,
                "name": node["name"],
                "domain": node["domain"],
                "kind": node["kind"],
                "status": "blocked" if blockers else "ready",
                "mastery": state.get("mastery", 0),
                "confidence": state.get("confidence", 0),
                "prerequisites": blockers,
                "isGoal": key in targets,
                "isReview": bool(state.get("evidenceCount")),
                "difficulty": task["difficulty"] if task else node["difficulty"],
                "taskId": task["id"] if task else None,
                "taskTitle": task["title"] if task else None,
                "minutes": minutes,
                "sessions": sessions,
                "reasons": reason,
                "priority": priority[key],
            }
        )
    return {
        "entries": entries,
        "completedNodeIds": sorted(satisfied),
        "targetNodeIds": sorted(targets),
        "goalReached": bool(targets) and targets <= satisfied,
        "totalMinutes": sum(entry["minutes"] for entry in entries),
        "estimatedDays": day if entries else 0,
        "nextNodeId": next((entry["nodeId"] for entry in entries if entry["status"] == "ready"), None),
    }


def decision_signature(result: dict, goal: dict) -> str:
    material = {
        "goal": goal,
        "completed": result["completedNodeIds"],
        "entries": [
            {
                key: entry[key]
                for key in (
                    "nodeId",
                    "status",
                    "difficulty",
                    "taskId",
                    "sessions",
                    "prerequisites",
                    "isReview",
                )
            }
            for entry in result["entries"]
        ],
    }
    return hashlib.sha256(json.dumps(material, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def decision_changes(previous: dict | None, result: dict) -> list[str]:
    if previous is None:
        return ["首次生成基于先修关系的学习路径"]
    changes = []
    old, new = previous["entries"], result["entries"]
    if [row["nodeId"] for row in old] != [row["nodeId"] for row in new]:
        changes.append("学习节点或补学顺序已调整")
    if [(row["nodeId"], row["status"]) for row in old] != [(row["nodeId"], row["status"]) for row in new]:
        changes.append("节点先修条件或解锁状态已变化")
    if [(row["taskId"], row["difficulty"]) for row in old] != [
        (row["taskId"], row["difficulty"]) for row in new
    ]:
        changes.append("评价任务或难度已调整")
    if [row["sessions"] for row in old] != [row["sessions"] for row in new]:
        changes.append("学习量与时间安排已调整")
    return changes or ["学习目标或复习安排已更新"]
