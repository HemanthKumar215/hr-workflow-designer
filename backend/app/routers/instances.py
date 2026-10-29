from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..auth import Admin, CurrentUser
from ..automations import ACTION_IDS
from ..database import get_db
from ..engine import WorkflowError, can_act, cancel_instance, decide_action, start_instance, sweep_overdue_approvals
from ..graph import has_errors, validate_graph
from ..models import ActionStatus, InstanceStatus, PendingAction, Role, User, Workflow, WorkflowInstance
from ..schemas import DecisionIn, InboxItem, InstanceIn, InstanceOut, InstanceSummary, StatsOut

router = APIRouter(prefix="/api", tags=["requests"])
DB = Annotated[Session, Depends(get_db)]
OVERSEERS = (Role.admin, Role.hrbp)


def _load(db: Session, instance_id: int) -> WorkflowInstance:
    inst = db.scalar(
        select(WorkflowInstance)
        .where(WorkflowInstance.id == instance_id)
        .options(selectinload(WorkflowInstance.actions), selectinload(WorkflowInstance.events))
    )
    if inst is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return inst


def _can_view(user: User, inst: WorkflowInstance) -> bool:
    if user.role in OVERSEERS or inst.started_by_id == user.id:
        return True
    return any(
        a.assignee_user_id == user.id or a.decided_by_id == user.id or a.assignee_role == user.role
        for a in inst.actions
    )


@router.post("/instances", response_model=InstanceOut, status_code=201)
def create_instance(body: InstanceIn, db: DB, user: CurrentUser):
    wf = db.get(Workflow, body.workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if has_errors(validate_graph(wf.graph, ACTION_IDS)):
        raise HTTPException(status_code=422, detail="This workflow has validation errors and can't be started.")
    try:
        inst = start_instance(db, wf, user, body.variables, body.title)
    except WorkflowError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return _load(db, inst.id)


@router.get("/instances", response_model=list[InstanceSummary])
def list_instances(db: DB, user: CurrentUser, scope: Literal["mine", "all"] = "mine",
                   status: InstanceStatus | None = None, limit: int = 100):
    q = select(WorkflowInstance).order_by(WorkflowInstance.created_at.desc()).limit(min(limit, 500))
    if scope == "mine" or user.role not in OVERSEERS:
        q = q.where(WorkflowInstance.started_by_id == user.id)
    if status:
        q = q.where(WorkflowInstance.status == status)
    return db.scalars(q).all()


@router.get("/instances/{instance_id}", response_model=InstanceOut)
def get_instance(instance_id: int, db: DB, user: CurrentUser):
    inst = _load(db, instance_id)
    if not _can_view(user, inst):
        raise HTTPException(status_code=403, detail="You can't view this request.")
    return inst


@router.post("/instances/{instance_id}/cancel", response_model=InstanceOut)
def cancel(instance_id: int, db: DB, user: CurrentUser):
    inst = _load(db, instance_id)
    if inst.started_by_id != user.id and user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only the requester or an admin can cancel.")
    try:
        cancel_instance(db, inst, user)
    except WorkflowError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return _load(db, instance_id)


@router.get("/inbox", response_model=list[InboxItem])
def inbox(db: DB, user: CurrentUser):
    """Open tasks and approvals the current user can act on."""
    q = select(PendingAction).where(PendingAction.status == ActionStatus.open).order_by(PendingAction.created_at)
    if user.role != Role.admin:
        q = q.where(or_(PendingAction.assignee_user_id == user.id, PendingAction.assignee_role == user.role))
    return [a for a in db.scalars(q).all() if can_act(user, a)]


@router.post("/actions/{action_id}/decide", response_model=InstanceOut)
def decide(action_id: int, body: DecisionIn, db: DB, user: CurrentUser):
    action = db.get(PendingAction, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail="Step not found")
    if not can_act(user, action):
        if action.status != ActionStatus.open:
            raise HTTPException(status_code=409, detail="This step has already been decided.")
        raise HTTPException(status_code=403, detail="You can't act on this step.")
    try:
        inst = decide_action(db, action, user, body.decision, body.comment)
    except WorkflowError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return _load(db, inst.id)


@router.get("/stats", response_model=StatsOut)
def stats(db: DB, user: CurrentUser):
    if user.role not in OVERSEERS:
        raise HTTPException(status_code=403, detail="Only admins and HRBPs can view stats.")
    by_status = dict(db.execute(select(WorkflowInstance.status, func.count()).group_by(WorkflowInstance.status)).all())
    done = db.execute(
        select(WorkflowInstance.created_at, WorkflowInstance.completed_at)
        .where(WorkflowInstance.status == InstanceStatus.completed, WorkflowInstance.completed_at.is_not(None))
    ).all()
    avg = (sum((c - s).total_seconds() for s, c in done) / len(done) / 3600) if done else None
    per_wf = db.execute(
        select(Workflow.id, Workflow.name, func.count(WorkflowInstance.id))
        .join(WorkflowInstance, WorkflowInstance.workflow_id == Workflow.id, isouter=True)
        .group_by(Workflow.id, Workflow.name)
        .order_by(func.count(WorkflowInstance.id).desc())
    ).all()
    return StatsOut(
        total=sum(by_status.values()),
        by_status={k.value: v for k, v in by_status.items()},
        open_actions=db.scalar(select(func.count()).where(PendingAction.status == ActionStatus.open)) or 0,
        avg_completion_hours=round(avg, 2) if avg is not None else None,
        by_workflow=[{"workflow_id": i, "name": n, "requests": c} for i, n, c in per_wf],
    )


@router.post("/admin/sweep-sla")
def sweep(db: DB, _: Admin):
    """Run the SLA job now (it also runs periodically in the background)."""
    return {"auto_approved": sweep_overdue_approvals(db)}
