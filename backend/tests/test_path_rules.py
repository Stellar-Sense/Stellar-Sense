from copy import deepcopy

import pytest

from app.services.path_rules import (
    RULES,
    build_decision,
    decision_signature,
    expand_dependencies,
    update_state,
)


def inputs():
    return {
        "nodes": [
            {
                "id": key,
                "name": key,
                "domain": "d",
                "kind": "concept",
                "difficulty": 1,
                "minutes": 30,
                "sortOrder": index,
            }
            for index, key in enumerate("abcd")
        ],
        "edges": [
            {"fromId": "a", "toId": "b", "relation": "prerequisite"},
            {"fromId": "b", "toId": "c", "relation": "prerequisite"},
        ],
        "states": {},
        "recent": {},
        "tasks": [],
        "rules": RULES,
        "goal": {"nodeIds": ["c"], "dailyMinutes": 20, "version": 1},
    }


def test_topology_precedes_priority_and_budget_is_respected():
    data = inputs()
    result = build_decision(data)
    assert [row["nodeId"] for row in result["entries"]] == list("abc")
    days = {}
    for row in result["entries"]:
        for session in row["sessions"]:
            days[session["day"]] = days.get(session["day"], 0) + session["minutes"]
    assert all(minutes <= 20 for minutes in days.values())
    assert build_decision(deepcopy(data)) == result


def test_skip_changes_preference_not_mastery_or_unlock():
    data = inputs()
    data["goal"]["nodeIds"] = []
    before = build_decision(data)
    data["recent"] = {"a": {"skipped": True}}
    after = build_decision(data)
    assert before["nextNodeId"] != after["nextNodeId"]
    assert after["completedNodeIds"] == []
    assert next(row for row in after["entries"] if row["nodeId"] == "b")["status"] == "blocked"


def test_containment_expands_and_mixed_cycles_are_rejected():
    data = inputs()
    data["edges"] = [
        {"fromId": "d", "toId": "a", "relation": "contains"},
        {"fromId": "d", "toId": "b", "relation": "contains"},
        {"fromId": "d", "toId": "c", "relation": "prerequisite"},
    ]
    parents, expanded = expand_dependencies(data["nodes"], data["edges"])
    assert expanded["d"] == {"a", "b"}
    assert parents["c"] == {"a", "b"}
    data["edges"].append({"fromId": "c", "toId": "a", "relation": "prerequisite"})
    with pytest.raises(ValueError, match="循环"):
        expand_dependencies(data["nodes"], data["edges"])


def test_confidence_requires_distinct_recent_tasks_and_hints_are_discounted():
    one = update_state({}, 100, 0, 1, 1, [])
    assert one["mastery"] == 100 and one["confidence"] == 30
    repeated = update_state(one, 100, 0, 1, 1, [])
    assert repeated["confidence"] == 30
    two = update_state(one, 100, 0, 2, 2, [])
    assert two["confidence"] == 60
    old = update_state(two, 100, 0, 5, 1, [])
    assert old["confidence"] == 40
    assisted = update_state({}, 100, 2, 1, 1, [])
    assert assisted["mastery"] == 90


def test_equivalent_recomputation_does_not_change_signature():
    data = inputs()
    first = build_decision(data)
    data["asOf"] = "2099-01-01"
    assert decision_signature(first, data["goal"]) == decision_signature(build_decision(data), data["goal"])
