"""Demo users and template workflows, created on first startup when the DB is empty."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Role, User, Workflow

DEMO_PASSWORD = "demo1234"

DEMO_USERS: list[dict[str, str]] = [
    {"email": "admin@demo.com", "full_name": "Aditi Rao", "role": "admin", "department": "People Ops"},
    {"email": "hrbp@demo.com", "full_name": "Rahul Mehta", "role": "hrbp", "department": "HR"},
    {"email": "manager@demo.com", "full_name": "Priya Sharma", "role": "manager", "department": "Engineering"},
    {"email": "director@demo.com", "full_name": "Vikram Iyer", "role": "director", "department": "Engineering"},
    {"email": "employee@demo.com", "full_name": "Arjun Kumar", "role": "employee", "department": "Engineering"},
]

EDGE_STYLE = {"animated": True, "style": {"stroke": "#6366f1", "strokeWidth": 2}}


def _node(id_: str, type_: str, x: int, y: int, **data: Any) -> dict[str, Any]:
    return {"id": id_, "type": type_, "position": {"x": x, "y": y}, "data": {"type": type_, **data}}


def _edge(src: str, tgt: str, condition: str = "") -> dict[str, Any]:
    e: dict[str, Any] = {"id": f"e-{src}-{tgt}", "source": src, "target": tgt, **EDGE_STYLE}
    if condition:
        e["data"] = {"condition": condition}
        e["label"] = condition
    return e


def _kv(key: str, value: str) -> dict[str, str]:
    return {"id": key, "key": key, "value": value}


LEAVE_REQUEST = {
    "nodes": [
        _node("start-1", "start", 0, 200, title="Leave Request",
              metadata=[_kv("leave_type", "Casual"), _kv("days", "2"), _kv("reason", "")]),
        _node("approval-1", "approval", 280, 200, title="Manager Approval", approverRole="Manager",
              autoApproveThreshold=2),
        _node("approval-2", "approval", 580, 60, title="HR Approval (long leave)", approverRole="HRBP",
              autoApproveThreshold=0),
        _node("automated-1", "automated", 880, 200, title="Deduct Leave Balance", actionId="update_hris",
              actionParams={"employee_id": "{{requester_email}}", "field": "leave_balance", "value": "-{{days}}"}),
        _node("automated-2", "automated", 1160, 200, title="Notify Employee", actionId="send_email",
              actionParams={"to": "{{requester_email}}", "subject": "Your {{leave_type}} leave is approved",
                            "body": "{{days}} day(s) approved. Enjoy!"}),
        _node("end-1", "end", 1440, 200, endMessage="Leave approved and balance updated.", includeSummary=True),
        _node("automated-3", "automated", 580, 380, title="Send Rejection Email", actionId="send_email",
              actionParams={"to": "{{requester_email}}", "subject": "Leave request declined", "body": ""}),
        _node("end-2", "end", 880, 380, endMessage="Leave request was declined.", includeSummary=True),
    ],
    "edges": [
        _edge("start-1", "approval-1"),
        _edge("approval-1", "approval-2", "days > 5"),
        _edge("approval-1", "automated-1", "else"),
        _edge("approval-1", "automated-3", 'outcome == "rejected"'),
        _edge("approval-2", "automated-1"),
        _edge("automated-1", "automated-2"),
        _edge("automated-2", "end-1"),
        _edge("automated-3", "end-2"),
    ],
}

ONBOARDING = {
    "nodes": [
        _node("start-1", "start", 0, 200, title="New Hire Onboarding",
              metadata=[_kv("new_hire_name", ""), _kv("new_hire_email", ""), _kv("department", "Engineering"),
                        _kv("start_date", "")]),
        _node("automated-1", "automated", 260, 200, title="Generate Offer Letter", actionId="generate_doc",
              actionParams={"template": "offer_letter", "recipient": "{{new_hire_name}}"}),
        _node("approval-1", "approval", 520, 200, title="Headcount Approval", approverRole="Director",
              autoApproveThreshold=0),
        _node("task-1", "task", 780, 200, title="Set Up Laptop & Accounts", description="Provision hardware and SSO.",
              assignee="admin", dueDate="", customFields=[]),
        _node("automated-2", "automated", 1040, 200, title="Create HRIS Record", actionId="update_hris",
              actionParams={"employee_id": "{{new_hire_email}}", "field": "status", "value": "active"}),
        _node("automated-3", "automated", 1300, 60, title="Request GitHub Access", actionId="create_ticket",
              actionParams={"project": "IT", "summary": "GitHub access for {{new_hire_name}}", "assignee": "it-desk"}),
        _node("automated-4", "automated", 1560, 200, title="Welcome on Slack", actionId="notify_slack",
              actionParams={"channel": "#welcome", "message": "Please welcome {{new_hire_name}} to {{department}}!"}),
        _node("end-1", "end", 1820, 200, endMessage="Onboarding complete.", includeSummary=True),
    ],
    "edges": [
        _edge("start-1", "automated-1"),
        _edge("automated-1", "approval-1"),
        _edge("approval-1", "task-1"),
        _edge("task-1", "automated-2"),
        _edge("automated-2", "automated-3", 'department == "Engineering"'),
        _edge("automated-2", "automated-4", "else"),
        _edge("automated-3", "automated-4"),
        _edge("automated-4", "end-1"),
    ],
}

TEMPLATES = [
    ("Leave Request", "Manager approval; leave over 5 days also needs HR. Auto-approves after 2 days.", LEAVE_REQUEST),
    ("Employee Onboarding", "Offer letter, director sign-off, IT setup, and Engineering-only GitHub access.", ONBOARDING),
]


def seed(db: Session) -> None:
    from .auth import hash_password

    if db.scalar(select(User).limit(1)) is not None:
        return
    pw = hash_password(DEMO_PASSWORD)
    users = [User(email=u["email"], full_name=u["full_name"], role=Role(u["role"]), department=u["department"],
                  password_hash=pw) for u in DEMO_USERS]
    db.add_all(users)
    db.flush()
    admin = users[0]
    for name, desc, graph in TEMPLATES:
        db.add(Workflow(name=name, description=desc, graph=graph, created_by_id=admin.id))
    db.commit()
