import pytest

from app.graph import ConditionError, Graph, evaluate_condition, select_next_edges, validate_graph
from app.seed import LEAVE_REQUEST, ONBOARDING


def n(id_, type_, **data):
    return {"id": id_, "type": type_, "data": {"type": type_, **data}}


def e(src, tgt, cond=""):
    edge = {"id": f"{src}-{tgt}", "source": src, "target": tgt}
    if cond:
        edge["data"] = {"condition": cond}
    return edge


def errors(graph):
    return [i for i in validate_graph(graph) if i["severity"] == "error"]


def test_templates_are_valid():
    assert errors(LEAVE_REQUEST) == []
    assert errors(ONBOARDING) == []


def test_missing_start_and_end():
    issues = errors({"nodes": [n("t", "task", title="T")], "edges": []})
    types = {i["type"] for i in issues}
    assert {"missing_start", "missing_end"} <= types


def test_cycle_detected():
    g = {
        "nodes": [n("s", "start"), n("a", "task", title="A"), n("b", "task", title="B"), n("x", "end")],
        "edges": [e("s", "a"), e("a", "b"), e("b", "a"), e("b", "x")],
    }
    assert any(i["type"] == "cycle_detected" for i in errors(g))


def test_bad_condition_is_reported():
    g = {"nodes": [n("s", "start"), n("x", "end")], "edges": [e("s", "x", "__import__('os')")]}
    assert any("Unsupported" in i["message"] or "syntax" in i["message"] for i in errors(g))


def test_unreachable_end_is_error():
    g = {"nodes": [n("s", "start"), n("t", "task", title="T"), n("x", "end")], "edges": [e("s", "t")]}
    assert any(i["message"] == "No End node is reachable from Start." for i in errors(g))


@pytest.mark.parametrize("expr,vars_,expected", [
    ("days > 5", {"days": "7"}, True),
    ("days > 5", {"days": 3}, False),
    ("days > 5", {}, False),  # missing variable never matches
    ('department == "Engineering" and amount >= 100', {"department": "Engineering", "amount": "150"}, True),
    ('leave_type in ["Sick", "Casual"]', {"leave_type": "Sick"}, True),
    ("not urgent", {"urgent": False}, True),
])
def test_evaluate_condition(expr, vars_, expected):
    assert evaluate_condition(expr, vars_) is expected


@pytest.mark.parametrize("expr", ["open('x')", "a.b", "x + 1 > 2", "[i for i in x]", "lambda: 1"])
def test_unsafe_conditions_rejected(expr):
    with pytest.raises(ConditionError):
        evaluate_condition(expr, {})


def test_else_branch_only_when_nothing_matches():
    g = Graph.from_json({
        "nodes": [n("s", "start"), n("a", "end"), n("b", "end")],
        "edges": [e("s", "a", "days > 5"), e("s", "b", "else")],
    })
    assert [x["target"] for x in select_next_edges(g, "s", {"days": 9})] == ["a"]
    assert [x["target"] for x in select_next_edges(g, "s", {"days": 1})] == ["b"]
