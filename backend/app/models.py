import enum
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    admin = "admin"
    hrbp = "hrbp"
    manager = "manager"
    director = "director"
    employee = "employee"


class InstanceStatus(str, enum.Enum):
    running = "running"      # actively executing (transient)
    waiting = "waiting"      # paused on at least one open task/approval
    completed = "completed"  # reached an End node
    rejected = "rejected"    # an approval was rejected with no rejection path
    failed = "failed"        # runtime error (e.g. no branch condition matched)


class ActionKind(str, enum.Enum):
    task = "task"
    approval = "approval"


class ActionStatus(str, enum.Enum):
    open = "open"
    completed = "completed"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False, length=20))
    department: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Workflow(Base):
    """A workflow definition designed on the canvas (React Flow nodes + edges)."""

    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    graph: Mapped[dict] = mapped_column(JSON)  # {"nodes": [...], "edges": [...]}
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    created_by: Mapped[User | None] = relationship()


class WorkflowInstance(Base):
    """One running request (e.g. a single leave request) executing a workflow."""

    __tablename__ = "workflow_instances"

    id: Mapped[int] = mapped_column(primary_key=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"), index=True)
    workflow_version: Mapped[int] = mapped_column(Integer)
    # Snapshot of the graph at start time, so later edits don't affect in-flight requests.
    graph: Mapped[dict] = mapped_column(JSON)
    title: Mapped[str] = mapped_column(String(255))
    variables: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[InstanceStatus] = mapped_column(Enum(InstanceStatus, native_enum=False, length=20), index=True)
    started_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workflow: Mapped[Workflow] = relationship()
    started_by: Mapped[User] = relationship()
    actions: Mapped[list["PendingAction"]] = relationship(
        back_populates="instance", cascade="all, delete-orphan", order_by="PendingAction.id"
    )
    events: Mapped[list["AuditEvent"]] = relationship(
        back_populates="instance", cascade="all, delete-orphan", order_by="AuditEvent.id"
    )


class PendingAction(Base):
    """A human step the engine is waiting on: a task to complete or an approval to decide."""

    __tablename__ = "pending_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("workflow_instances.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(255))
    kind: Mapped[ActionKind] = mapped_column(Enum(ActionKind, native_enum=False, length=20))
    status: Mapped[ActionStatus] = mapped_column(
        Enum(ActionStatus, native_enum=False, length=20), default=ActionStatus.open, index=True
    )
    # Who can act: a specific user, or anyone holding a role.
    assignee_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    assignee_role: Mapped[Role | None] = mapped_column(Enum(Role, native_enum=False, length=20), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_approve_on_due: Mapped[bool] = mapped_column(default=False)
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    instance: Mapped[WorkflowInstance] = relationship(back_populates="actions")
    assignee_user: Mapped[User | None] = relationship(foreign_keys=[assignee_user_id])
    decided_by: Mapped[User | None] = relationship(foreign_keys=[decided_by_id])


class AuditEvent(Base):
    """Append-only log of everything that happened to an instance."""

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("workflow_instances.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    node_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50))
    message: Mapped[str] = mapped_column(Text)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    instance: Mapped[WorkflowInstance] = relationship(back_populates="events")
    actor: Mapped[User | None] = relationship()
