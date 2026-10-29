from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORM):
    id: int
    email: str
    full_name: str
    role: str
    department: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginIn(BaseModel):
    email: str
    password: str


class GraphIn(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)


class WorkflowIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    graph: GraphIn


class WorkflowSummary(ORM):
    id: int
    name: str
    description: str
    version: int
    updated_at: datetime
    node_count: int = 0
    form_fields: list[str] = Field(default_factory=list)


class WorkflowOut(WorkflowSummary):
    graph: dict[str, Any]
    created_at: datetime


class ValidationIssue(BaseModel):
    type: str
    message: str
    severity: Literal["error", "warning"]
    nodeId: str | None = None


class SimulateIn(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    variables: dict[str, Any] = Field(default_factory=dict)
    decisions: dict[str, Literal["approved", "rejected"]] = Field(default_factory=dict)


class SimulationStep(BaseModel):
    nodeId: str
    nodeType: str
    nodeLabel: str
    status: str
    message: str
    assignee: str | None = None
    timestamp: str


class SimulationOut(BaseModel):
    status: Literal["success", "failure", "partial"]
    steps: list[SimulationStep]
    validationErrors: list[ValidationIssue]
    executionTimeMs: int
    variables: dict[str, Any] = Field(default_factory=dict)


class InstanceIn(BaseModel):
    workflow_id: int
    title: str | None = None
    variables: dict[str, Any] = Field(default_factory=dict)


class DecisionIn(BaseModel):
    decision: Literal["approve", "reject", "complete"]
    comment: str = Field(default="", max_length=2000)


class ActionOut(ORM):
    id: int
    instance_id: int
    node_id: str
    title: str
    kind: str
    status: str
    assignee_role: str | None
    assignee_user: UserOut | None
    decided_by: UserOut | None
    comment: str
    due_at: datetime | None
    auto_approve_on_due: bool
    created_at: datetime
    decided_at: datetime | None


class EventOut(ORM):
    id: int
    node_id: str | None
    node_type: str | None
    event_type: str
    message: str
    actor: UserOut | None
    data: dict[str, Any]
    created_at: datetime


class InstanceSummary(ORM):
    id: int
    workflow_id: int
    workflow_version: int
    title: str
    status: str
    started_by: UserOut
    variables: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class InstanceOut(InstanceSummary):
    graph: dict[str, Any]
    actions: list[ActionOut]
    events: list[EventOut]


class InboxItem(ActionOut):
    instance: InstanceSummary
    can_act: bool = True


class StatsOut(BaseModel):
    total: int
    by_status: dict[str, int]
    open_actions: int
    avg_completion_hours: float | None
    by_workflow: list[dict[str, Any]]
