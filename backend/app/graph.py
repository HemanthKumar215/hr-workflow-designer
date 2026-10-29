"""Workflow graph helpers: parsing, validation and safe evaluation of branch conditions.

A graph is the React Flow JSON saved by the designer:
    {"nodes": [{"id", "type", "data": {...}}, ...],
     "edges": [{"id", "source", "target", "data": {"condition": "days > 5"}}, ...]}
"""

from __future__ import annotations

import ast
from collections import deque
from dataclasses import dataclass, field
from typing import Any

NODE_TYPES = {"start", "task", "approval", "automated", "end"}
APPROVER_ROLES = {"Manager": "manager", "HRBP": "hrbp", "Director": "director"}
ELSE_KEYWORD = "else"


class ConditionError(ValueError):
    pass


# ─── Graph model ──────────────────────────────────────────────────────────────


@dataclass
class Graph:
    nodes: dict[str, dict[str, Any]]
    outgoing: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    incoming: dict[str, list[dict[str, Any]]] = field(default_factory=dict)

    @classmethod
    def from_json(cls, graph: dict[str, Any]) -> "Graph":
        nodes = {n["id"]: n for n in graph.get("nodes", []) if "id" in n}
        g = cls(nodes=nodes, outgoing={nid: [] for nid in nodes}, incoming={nid: [] for nid in nodes})
        for e in graph.get("edges", []):
            src, tgt = e.get("source"), e.get("target")
            if src in nodes and tgt in nodes:
                g.outgoing[src].append(e)
                g.incoming[tgt].append(e)
        return g

    def node_type(self, node_id: str) -> str:
        node = self.nodes[node_id]
        return (node.get("data") or {}).get("type") or node.get("type") or "unknown"

    def data(self, node_id: str) -> dict[str, Any]:
        return self.nodes[node_id].get("data") or {}

    def label(self, node_id: str) -> str:
        d = self.data(node_id)
        return d.get("title") or d.get("endMessage") or node_id

    def start_nodes(self) -> list[str]:
        return [nid for nid in self.nodes if self.node_type(nid) == "start"]


def edge_condition(edge: dict[str, Any]) -> str:
    return str(((edge.get("data") or {}).get("condition") or "")).strip()


# ─── Safe condition evaluation ────────────────────────────────────────────────
# Conditions are small Python-like expressions over the request's variables, e.g.
#   days > 5
#   department == "Engineering" and amount >= 50000
#   outcome == "rejected"
# They're parsed with `ast` and only a whitelist of node types is allowed, so
# there's no eval() and no way to call functions or access attributes.

_ALLOWED_NODES = (
    ast.Expression, ast.BoolOp, ast.And, ast.Or, ast.UnaryOp, ast.Not, ast.USub,
    ast.Compare, ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.In, ast.NotIn,
    ast.Name, ast.Load, ast.Constant, ast.List, ast.Tuple,
)


def parse_condition(expr: str) -> ast.Expression:
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as exc:
        raise ConditionError(f"Invalid condition syntax: {expr!r}") from exc
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED_NODES):
            raise ConditionError(f"Unsupported expression in condition {expr!r}: {type(node).__name__}")
    return tree


def _coerce(value: Any) -> Any:
    """Form values arrive as strings; treat numeric-looking strings as numbers."""
    if isinstance(value, str):
        v = value.strip()
        try:
            return int(v)
        except ValueError:
            try:
                return float(v)
            except ValueError:
                return value
    return value


def _eval(node: ast.AST, variables: dict[str, Any]) -> Any:
    if isinstance(node, ast.Expression):
        return _eval(node.body, variables)
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id in ("true", "True"):
            return True
        if node.id in ("false", "False"):
            return False
        return _coerce(variables.get(node.id))
    if isinstance(node, (ast.List, ast.Tuple)):
        return [_eval(e, variables) for e in node.elts]
    if isinstance(node, ast.UnaryOp):
        val = _eval(node.operand, variables)
        if isinstance(node.op, ast.Not):
            return not val
        return -val
    if isinstance(node, ast.BoolOp):
        vals = (_eval(v, variables) for v in node.values)
        return all(vals) if isinstance(node.op, ast.And) else any(vals)
    if isinstance(node, ast.Compare):
        left = _eval(node.left, variables)
        for op, comp in zip(node.ops, node.comparators):
            right = _eval(comp, variables)
            try:
                ok = {
                    ast.Eq: lambda a, b: a == b,
                    ast.NotEq: lambda a, b: a != b,
                    ast.Lt: lambda a, b: a < b,
                    ast.LtE: lambda a, b: a <= b,
                    ast.Gt: lambda a, b: a > b,
                    ast.GtE: lambda a, b: a >= b,
                    ast.In: lambda a, b: a in b,
                    ast.NotIn: lambda a, b: a not in b,
                }[type(op)](left, right)
            except TypeError:
                ok = False  # e.g. comparing a missing variable (None) with a number
            if not ok:
                return False
            left = right
        return True
    raise ConditionError(f"Unsupported expression: {type(node).__name__}")


def references_outcome(expr: str) -> bool:
    """True if a condition tests the approval outcome, e.g. `outcome == "rejected"`."""
    if not expr or expr.lower() == ELSE_KEYWORD:
        return False
    try:
        tree = parse_condition(expr)
    except ConditionError:
        return False
    return any(isinstance(n, ast.Name) and n.id == "outcome" for n in ast.walk(tree))


def evaluate_condition(expr: str, variables: dict[str, Any]) -> bool:
    return bool(_eval(parse_condition(expr), variables))


def select_next_edges(graph: Graph, node_id: str, variables: dict[str, Any]) -> list[dict[str, Any]]:
    """Pick which outgoing edges to follow.

    - Edges with no condition are always followed (parallel branches).
    - Conditional edges are followed when their condition is true.
    - An edge whose condition is `else` is followed only if no other conditional edge matched.
    """
    edges = graph.outgoing.get(node_id, [])
    unconditional = [e for e in edges if not edge_condition(e)]
    else_edges = [e for e in edges if edge_condition(e).lower() == ELSE_KEYWORD]
    conditional = [e for e in edges if edge_condition(e) and edge_condition(e).lower() != ELSE_KEYWORD]

    matched = [e for e in conditional if evaluate_condition(edge_condition(e), variables)]
    if conditional and not matched:
        matched = else_edges
    elif not conditional:
        matched = else_edges if not unconditional else []
    return unconditional + matched


# ─── Validation ───────────────────────────────────────────────────────────────


def _issue(type_: str, message: str, severity: str = "error", node_id: str | None = None) -> dict[str, Any]:
    err: dict[str, Any] = {"type": type_, "message": message, "severity": severity}
    if node_id:
        err["nodeId"] = node_id
    return err


def has_cycle(graph: Graph) -> bool:
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in graph.nodes}
    for root in graph.nodes:
        if color[root] != WHITE:
            continue
        # Iterative DFS so large graphs can't hit the recursion limit.
        stack: list[tuple[str, int]] = [(root, 0)]
        color[root] = GRAY
        while stack:
            nid, idx = stack[-1]
            out = graph.outgoing[nid]
            if idx < len(out):
                stack[-1] = (nid, idx + 1)
                nxt = out[idx]["target"]
                if color[nxt] == GRAY:
                    return True
                if color[nxt] == WHITE:
                    color[nxt] = GRAY
                    stack.append((nxt, 0))
            else:
                color[nid] = BLACK
                stack.pop()
    return False


def reachable_from(graph: Graph, start: str) -> set[str]:
    seen = {start}
    q = deque([start])
    while q:
        for e in graph.outgoing[q.popleft()]:
            if e["target"] not in seen:
                seen.add(e["target"])
                q.append(e["target"])
    return seen


def validate_graph(raw: dict[str, Any], known_actions: set[str] | None = None) -> list[dict[str, Any]]:
    """Return validation issues. Anything with severity 'error' blocks execution."""
    graph = Graph.from_json(raw)
    issues: list[dict[str, Any]] = []

    if not graph.nodes:
        return [_issue("missing_start", "Workflow is empty.")]

    starts = graph.start_nodes()
    ends = [nid for nid in graph.nodes if graph.node_type(nid) == "end"]
    if not starts:
        issues.append(_issue("missing_start", "Workflow must have a Start node."))
    elif len(starts) > 1:
        issues.append(_issue("missing_start", "Workflow must have exactly one Start node."))
    if not ends:
        issues.append(_issue("missing_end", "Workflow must have at least one End node."))

    for nid in graph.nodes:
        t = graph.node_type(nid)
        label = graph.label(nid)
        if t not in NODE_TYPES:
            issues.append(_issue("invalid_config", f'Node "{label}" has unknown type "{t}".', node_id=nid))
            continue
        if t != "end" and not graph.outgoing[nid]:
            sev = "error" if t == "start" else "warning"
            issues.append(_issue("missing_connection", f'"{label}" has no outgoing connection.', sev, nid))
        if t == "end" and graph.outgoing[nid]:
            issues.append(_issue("invalid_config", "End nodes cannot have outgoing connections.", node_id=nid))
        if t == "start" and graph.incoming[nid]:
            issues.append(_issue("invalid_config", "Start node cannot have incoming connections.", node_id=nid))
        if t not in ("start",) and not graph.incoming[nid] and not graph.outgoing[nid]:
            issues.append(_issue("isolated_node", f'Node "{label}" is isolated (no connections).', "warning", nid))
        d = graph.data(nid)
        if t == "approval" and d.get("approverRole") not in APPROVER_ROLES:
            issues.append(_issue("invalid_config", f'Approval "{label}" needs a valid approver role.', node_id=nid))
        if t == "automated":
            action = d.get("actionId") or ""
            if not action:
                issues.append(_issue("invalid_config", f'Automated step "{label}" has no action selected.', "warning", nid))
            elif known_actions is not None and action not in known_actions:
                issues.append(_issue("invalid_config", f'Unknown automation "{action}" in "{label}".', node_id=nid))

        # Branch conditions must parse.
        out = graph.outgoing[nid]
        else_count = 0
        for e in out:
            cond = edge_condition(e)
            if cond.lower() == ELSE_KEYWORD:
                else_count += 1
            elif cond:
                try:
                    parse_condition(cond)
                except ConditionError as exc:
                    issues.append(_issue("invalid_config", f'Edge from "{label}": {exc}', node_id=nid))
        if else_count > 1:
            issues.append(_issue("invalid_config", f'"{label}" has more than one "else" branch.', node_id=nid))

    if has_cycle(graph):
        issues.append(_issue("cycle_detected", "Workflow contains a cycle. Execution loops are not allowed."))

    if len(starts) == 1:
        reach = reachable_from(graph, starts[0])
        for nid in graph.nodes:
            if nid not in reach and graph.node_type(nid) != "start":
                issues.append(_issue("isolated_node", f'"{graph.label(nid)}" can never be reached from Start.', "warning", nid))
        if ends and not any(e in reach for e in ends):
            issues.append(_issue("missing_connection", "No End node is reachable from Start."))

    return issues


def has_errors(issues: list[dict[str, Any]]) -> bool:
    return any(i["severity"] == "error" for i in issues)
