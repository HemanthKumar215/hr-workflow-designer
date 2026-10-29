"""The workflow execution engine.

`Executor` walks the graph from a set of nodes, running automated steps immediately and
pausing at tasks and approvals. Subclasses decide what "pausing" means:

- `DbExecutor` persists a PendingAction and stops; a person resumes it later via the API.
- `SimulationExecutor` resolves every human step instantly so the designer can dry-run a
  workflow and see the exact path it would take for a given request.

Both share the same routing rules, so a simulation always matches real execution.
"""

from __future__ import annotations

from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import automations
from .graph import APPROVER_ROLES, ConditionError, Graph, edge_condition, references_outcome, select_next_edges
from .models import (
    ActionKind,
    ActionStatus,
    AuditEvent,
    InstanceStatus,
    PendingAction,
    Role,
    User,
    Workflow,
    WorkflowInstance,
    utcnow,
)

MAX_STEPS = 1000  # hard stop against runaway graphs (cycles are also rejected by validation)


class WorkflowError(Exception):
    pass


def start_variables(graph: Graph, overrides: dict[str, Any]) -> dict[str, Any]:
    """Start-node metadata (key/value pairs) acts as the request form's default values."""
    variables: dict[str, Any] = {}
    starts = graph.start_nodes()
    if starts:
        for kv in graph.data(starts[0]).get("metadata") or []:
            key = str(kv.get("key") or "").strip()
            if key:
                variables[key] = kv.get("value", "")
    variables.update({k: v for k, v in (overrides or {}).items() if k})
    return variables


class Executor:
    """Graph walker. Subclasses implement the hooks at the bottom."""

    def __init__(self, graph: Graph, variables: dict[str, Any]):
        self.graph = graph
        self.variables = variables
        self.reached_end = False
        self.rejected = False
        self.failed: str | None = None
        self._steps = 0

    # ── public API ──
    def run_from(self, node_ids: list[str]) -> None:
        queue: deque[str] = deque(node_ids)
        while queue and not self.failed and not self.rejected:
            self._steps += 1
            if self._steps > MAX_STEPS:
                self._fail("Step limit exceeded; the workflow may contain a loop.")
                return
            queue.extend(self._execute(queue.popleft()))

    def resume(self, node_id: str, outcome: str) -> None:
        """Continue after a human step finished with outcome completed/approved/rejected."""
        self.run_from(self._route(node_id, outcome))

    # ── execution ──
    def _execute(self, nid: str) -> list[str]:
        if nid not in self.graph.nodes:
            self._fail(f'Node "{nid}" no longer exists in this workflow.')
            return []
        t = self.graph.node_type(nid)
        d = self.graph.data(nid)
        label = self.graph.label(nid)

        if t == "start":
            self.on_event(nid, t, "node_completed", f'Workflow "{label}" initiated.')
            return self._route(nid)

        if t == "automated":
            action_id = d.get("actionId") or ""
            if not action_id:
                self.on_event(nid, t, "node_skipped", f'"{label}" has no action configured; skipped.')
                return self._route(nid)
            try:
                message, params = automations.run_action(action_id, d.get("actionParams") or {}, self.variables)
            except Exception as exc:  # a failing integration fails the request, visibly
                self._fail(f'Automation "{label}" failed: {exc}')
                return []
            self.on_event(nid, t, "automation_run", message, {"actionId": action_id, "params": params})
            return self._route(nid)

        if t == "task":
            outcome = self.on_task(nid, label, d)
            return [] if outcome is None else self._route(nid, outcome)

        if t == "approval":
            role = APPROVER_ROLES.get(d.get("approverRole", ""), "manager")
            outcome = self.on_approval(nid, label, d, role)
            return [] if outcome is None else self._route(nid, outcome)

        if t == "end":
            self.reached_end = True
            self.on_event(nid, t, "node_completed", d.get("endMessage") or "Workflow completed.")
            return []

        self._fail(f'Unknown node type "{t}".')
        return []

    def _route(self, nid: str, outcome: str | None = None) -> list[str]:
        t = self.graph.node_type(nid)
        scope = dict(self.variables)
        if outcome is not None:
            scope["outcome"] = outcome
        try:
            edges = select_next_edges(self.graph, nid, scope)
        except ConditionError as exc:
            self._fail(str(exc))
            return []

        if outcome == "rejected":
            # A rejection only follows a branch that tests the outcome (e.g. `outcome == "rejected"`);
            # every other edge out of an approval belongs to the "approved" path.
            edges = [e for e in edges if references_outcome(edge_condition(e))]
            if not edges:
                self.rejected = True
                return []

        all_out = self.graph.outgoing.get(nid, [])
        if not edges and all_out:
            self._fail(f'No branch condition matched after "{self.graph.label(nid)}".')
            return []
        if not edges and t != "end":
            self.on_event(nid, t, "branch_ended", f'Branch ended after "{self.graph.label(nid)}" (no End node).')

        for e in edges:
            cond = edge_condition(e)
            if cond:
                self.on_event(nid, t, "branch_taken", f'Condition "{cond}" matched → "{self.graph.label(e["target"])}".',
                              {"condition": cond, "target": e["target"]})
        return [e["target"] for e in edges]

    def _fail(self, reason: str) -> None:
        self.failed = reason
        self.on_event(None, None, "failed", reason)

    # ── hooks ──
    def on_event(self, nid: str | None, ntype: str | None, event_type: str, message: str,
                 data: dict[str, Any] | None = None) -> None:
        raise NotImplementedError

    def on_task(self, nid: str, label: str, d: dict[str, Any]) -> str | None:
        """Return an outcome to continue immediately, or None to pause."""
        raise NotImplementedError

    def on_approval(self, nid: str, label: str, d: dict[str, Any], role: str) -> str | None:
        raise NotImplementedError


# ─── Persistent execution ─────────────────────────────────────────────────────


def _parse_due_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def resolve_assignee(db: Session, raw: str, instance: WorkflowInstance) -> tuple[User | None, Role | None]:
    """Turn a task's free-text assignee into a user or a role.

    Accepts an email, a full name, a role name (e.g. "HRBP"), or "requester"/blank.
    """
    value = automations.render(raw or "", instance.variables).strip()
    if not value or value.lower() in ("requester", "{{requester}}", "initiator"):
        return instance.started_by, None
    try:
        return None, Role(value.lower())
    except ValueError:
        pass
    user = db.scalar(select(User).where(User.email.ilike(value)))
    if user is None:
        user = db.scalar(select(User).where(User.full_name.ilike(value)))
    if user is None:
        return instance.started_by, None  # unknown name: fall back to the requester
    return user, None


class DbExecutor(Executor):
    def __init__(self, db: Session, instance: WorkflowInstance, actor: User | None):
        super().__init__(Graph.from_json(instance.graph), instance.variables)
        self.db = db
        self.instance = instance
        self.actor = actor

    def on_event(self, nid, ntype, event_type, message, data=None):
        self.db.add(AuditEvent(instance=self.instance, node_id=nid, node_type=ntype, event_type=event_type,
                               message=message, actor_id=self.actor.id if self.actor else None, data=data or {}))

    def on_task(self, nid, label, d):
        user, role = resolve_assignee(self.db, d.get("assignee", ""), self.instance)
        action = PendingAction(instance=self.instance, node_id=nid, title=label, kind=ActionKind.task,
                               assignee_user_id=user.id if user else None, assignee_role=role,
                               due_at=_parse_due_date(d.get("dueDate", "")))
        self.db.add(action)
        who = user.full_name if user else f"any {role.value}"
        self.on_event(nid, "task", "task_assigned", f'Task "{label}" assigned to {who}.')
        return None

    def on_approval(self, nid, label, d, role):
        days = int(d.get("autoApproveThreshold") or 0)
        due = utcnow() + timedelta(days=days) if days > 0 else None
        self.db.add(PendingAction(instance=self.instance, node_id=nid, title=label, kind=ActionKind.approval,
                                  assignee_role=Role(role), due_at=due, auto_approve_on_due=days > 0))
        sla = f" Auto-approves in {days} day{'s' if days != 1 else ''} if no decision." if days else ""
        self.on_event(nid, "approval", "approval_requested", f'Approval "{label}" requested from {d.get("approverRole")}.{sla}')
        return None


def _open_actions(instance: WorkflowInstance) -> list[PendingAction]:
    return [a for a in instance.actions if a.status == ActionStatus.open]


def _finalize(db: Session, ex: DbExecutor) -> None:
    inst = ex.instance
    db.flush()
    db.refresh(inst)
    if ex.failed or ex.rejected:
        for a in _open_actions(inst):
            a.status = ActionStatus.cancelled
        inst.status = InstanceStatus.failed if ex.failed else InstanceStatus.rejected
        inst.completed_at = utcnow()
        if ex.rejected:
            ex.on_event(None, None, "rejected", "Request rejected.")
    elif _open_actions(inst):
        inst.status = InstanceStatus.waiting
    else:
        inst.status = InstanceStatus.completed
        inst.completed_at = utcnow()
        ex.on_event(None, None, "completed", "Request completed.")
    db.commit()
    db.refresh(inst)


def start_instance(db: Session, workflow: Workflow, user: User, variables: dict[str, Any],
                   title: str | None = None) -> WorkflowInstance:
    graph = Graph.from_json(workflow.graph)
    starts = graph.start_nodes()
    if len(starts) != 1:
        raise WorkflowError("Workflow must have exactly one Start node.")
    vars_ = start_variables(graph, variables)
    vars_.setdefault("requester_name", user.full_name)
    vars_.setdefault("requester_email", user.email)
    vars_.setdefault("requester_department", user.department)

    inst = WorkflowInstance(workflow_id=workflow.id, workflow_version=workflow.version, graph=workflow.graph,
                            title=title or f"{workflow.name} — {user.full_name}", variables=vars_,
                            status=InstanceStatus.running, started_by=user)
    db.add(inst)
    db.flush()
    ex = DbExecutor(db, inst, user)
    ex.on_event(None, None, "started", f"{user.full_name} submitted the request.", {"variables": vars_})
    ex.run_from(starts)
    _finalize(db, ex)
    return inst


def can_act(user: User, action: PendingAction) -> bool:
    if action.status != ActionStatus.open:
        return False
    if action.kind == ActionKind.approval and action.instance.started_by_id == user.id and user.role != Role.admin:
        return False  # no approving your own request
    if user.role == Role.admin:
        return True
    if action.assignee_user_id is not None:
        return action.assignee_user_id == user.id
    return action.assignee_role == user.role


def decide_action(db: Session, action: PendingAction, user: User | None, decision: str, comment: str = "",
                  system: bool = False) -> WorkflowInstance:
    """Complete a task or approve/reject an approval, then resume execution."""
    if action.status != ActionStatus.open:
        raise WorkflowError("This step has already been decided.")
    valid = {"complete"} if action.kind == ActionKind.task else {"approve", "reject"}
    if decision not in valid:
        raise WorkflowError(f"Invalid decision {decision!r} for a {action.kind.value}.")

    outcome = {"complete": "completed", "approve": "approved", "reject": "rejected"}[decision]
    action.status = ActionStatus(outcome)
    action.decided_by_id = user.id if user else None
    action.decided_at = utcnow()
    action.comment = comment

    inst = action.instance
    inst.status = InstanceStatus.running
    ex = DbExecutor(db, inst, user)
    who = "System (SLA timeout)" if system else (user.full_name if user else "System")
    note = f' — "{comment}"' if comment else ""
    ex.on_event(action.node_id, action.kind.value, f"{action.kind.value}_{outcome}",
                f'"{action.title}" {outcome} by {who}{note}.', {"comment": comment})
    ex.resume(action.node_id, outcome)
    _finalize(db, ex)
    return inst


def cancel_instance(db: Session, inst: WorkflowInstance, user: User) -> WorkflowInstance:
    if inst.status not in (InstanceStatus.waiting, InstanceStatus.running):
        raise WorkflowError("Only active requests can be cancelled.")
    for a in _open_actions(inst):
        a.status = ActionStatus.cancelled
    inst.status = InstanceStatus.failed
    inst.completed_at = utcnow()
    db.add(AuditEvent(instance=inst, event_type="cancelled", message=f"Cancelled by {user.full_name}.", actor_id=user.id))
    db.commit()
    db.refresh(inst)
    return inst


def sweep_overdue_approvals(db: Session, now: datetime | None = None) -> int:
    """Auto-approve approvals whose SLA (auto-approve threshold) has passed."""
    now = now or utcnow()
    overdue = db.scalars(
        select(PendingAction).where(
            PendingAction.status == ActionStatus.open,
            PendingAction.auto_approve_on_due.is_(True),
            PendingAction.due_at.is_not(None),
        )
    ).all()
    count = 0
    for action in overdue:
        due = action.due_at if action.due_at.tzinfo else action.due_at.replace(tzinfo=timezone.utc)
        if due <= now:
            decide_action(db, action, None, "approve", "Auto-approved after SLA expired.", system=True)
            count += 1
    return count


# ─── Simulation (dry run) ─────────────────────────────────────────────────────


class SimulationExecutor(Executor):
    """Runs the real routing logic with every human step resolved instantly.

    `decisions` lets the caller force outcomes, e.g. {"approval-2": "rejected"}, to test
    rejection paths without creating real requests.
    """

    def __init__(self, graph: Graph, variables: dict[str, Any], decisions: dict[str, str] | None = None):
        super().__init__(graph, variables)
        self.decisions = decisions or {}
        self.steps: list[dict[str, Any]] = []
        self._t0 = utcnow()

    def _step(self, nid, ntype, status, message, assignee=None):
        self.steps.append({
            "nodeId": nid or "",
            "nodeType": ntype or "system",
            "nodeLabel": self.graph.label(nid) if nid in self.graph.nodes else "Workflow",
            "status": status,
            "message": message,
            "assignee": assignee,
            "timestamp": (self._t0 + timedelta(seconds=len(self.steps))).isoformat(),
        })

    def on_event(self, nid, ntype, event_type, message, data=None):
        status = {"failed": "error", "node_skipped": "skipped"}.get(event_type, "completed")
        if event_type == "branch_taken":
            status = "completed"
        self._step(nid, ntype, status, message)

    def on_task(self, nid, label, d):
        assignee = d.get("assignee") or "requester"
        self._step(nid, "task", "completed", f'Task "{label}" assigned to {assignee} and completed.', assignee)
        return "completed"

    def on_approval(self, nid, label, d, role):
        outcome = self.decisions.get(nid, "approved")
        self._step(nid, "approval", "completed" if outcome == "approved" else "error",
                   f'Approval "{label}" {outcome} by {d.get("approverRole")}.')
        return outcome


def simulate(graph_json: dict[str, Any], variables: dict[str, Any] | None = None,
             decisions: dict[str, str] | None = None) -> dict[str, Any]:
    graph = Graph.from_json(graph_json)
    starts = graph.start_nodes()
    vars_ = start_variables(graph, variables or {})
    # Stand-in requester so {{requester_*}} templates render in the preview.
    vars_.setdefault("requester_name", "Test User")
    vars_.setdefault("requester_email", "test.user@example.com")
    vars_.setdefault("requester_department", "Engineering")
    ex = SimulationExecutor(graph, vars_, decisions)
    if starts:
        ex.run_from(starts[:1])
    if ex.failed:
        status = "failure"
    elif ex.rejected:
        ex._step(None, None, "error", "Request rejected (no rejection branch).")
        status = "partial"
    else:
        status = "success" if ex.reached_end else "partial"
    return {"status": status, "steps": ex.steps, "variables": ex.variables}
