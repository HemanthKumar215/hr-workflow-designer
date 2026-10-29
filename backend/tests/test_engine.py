from datetime import timedelta

from app.engine import simulate, sweep_overdue_approvals
from app.models import ActionStatus, PendingAction, utcnow
from app.seed import LEAVE_REQUEST, ONBOARDING


def leave_id(client, headers):
    wfs = client.get("/api/workflows", headers=headers).json()
    return next(w["id"] for w in wfs if w["name"] == "Leave Request")


def start_leave(client, as_, days):
    wid = leave_id(client, as_("employee"))
    r = client.post("/api/instances", headers=as_("employee"),
                    json={"workflow_id": wid, "variables": {"days": days, "leave_type": "Casual"}})
    assert r.status_code == 201, r.text
    return r.json()


def inbox(client, headers):
    return client.get("/api/inbox", headers=headers).json()


def decide(client, headers, action_id, decision, comment=""):
    r = client.post(f"/api/actions/{action_id}/decide", headers=headers,
                    json={"decision": decision, "comment": comment})
    assert r.status_code == 200, r.text
    return r.json()


def test_short_leave_needs_only_manager(client, as_):
    inst = start_leave(client, as_, 2)
    assert inst["status"] == "waiting"
    items = inbox(client, as_("manager"))
    assert [i["title"] for i in items] == ["Manager Approval"]
    assert inbox(client, as_("hrbp")) == []  # HR isn't involved yet

    done = decide(client, as_("manager"), items[0]["id"], "approve", "Enjoy")
    assert done["status"] == "completed"
    types = [ev["event_type"] for ev in done["events"]]
    assert "automation_run" in types and types[-1] == "completed"
    # {{templates}} are filled from the request
    hris = next(ev for ev in done["events"] if ev["data"].get("actionId") == "update_hris")
    assert hris["data"]["params"]["value"] == "-2"


def test_long_leave_routes_to_hr(client, as_):
    inst = start_leave(client, as_, 8)
    decide(client, as_("manager"), inbox(client, as_("manager"))[0]["id"], "approve")
    hr_items = inbox(client, as_("hrbp"))
    assert [i["title"] for i in hr_items] == ["HR Approval (long leave)"]
    assert hr_items[0]["instance"]["id"] == inst["id"]
    done = decide(client, as_("hrbp"), hr_items[0]["id"], "approve")
    assert done["status"] == "completed"


def test_manager_rejection_follows_rejection_branch(client, as_):
    start_leave(client, as_, 8)  # days > 5 must NOT be followed on rejection
    done = decide(client, as_("manager"), inbox(client, as_("manager"))[0]["id"], "reject", "Busy sprint")
    assert done["status"] == "completed"
    assert done["events"][-2]["message"] == "Leave request was declined."
    assert inbox(client, as_("hrbp")) == []


def test_rejection_without_branch_rejects_request(client, as_):
    start_leave(client, as_, 8)
    decide(client, as_("manager"), inbox(client, as_("manager"))[0]["id"], "approve")
    done = decide(client, as_("hrbp"), inbox(client, as_("hrbp"))[0]["id"], "reject")
    assert done["status"] == "rejected"


def test_permissions(client, as_):
    inst = start_leave(client, as_, 1)
    action_id = inst["actions"][0]["id"]
    # employee can't approve, director has the wrong role
    for who in ("employee", "director"):
        r = client.post(f"/api/actions/{action_id}/decide", headers=as_(who), json={"decision": "approve"})
        assert r.status_code == 403
    # wrong decision type for an approval
    r = client.post(f"/api/actions/{action_id}/decide", headers=as_("manager"), json={"decision": "complete"})
    assert r.status_code == 422
    decide(client, as_("manager"), action_id, "approve")
    r = client.post(f"/api/actions/{action_id}/decide", headers=as_("manager"), json={"decision": "approve"})
    assert r.status_code == 409  # can't decide twice
    # other employees can't view someone's request
    assert client.get(f"/api/instances/{inst['id']}", headers=as_("director")).status_code == 403


def test_cannot_approve_own_request(client, as_):
    wid = leave_id(client, as_("manager"))
    inst = client.post("/api/instances", headers=as_("manager"), json={"workflow_id": wid, "variables": {"days": 1}}).json()
    assert inbox(client, as_("manager")) == []
    r = client.post(f"/api/actions/{inst['actions'][0]['id']}/decide", headers=as_("manager"), json={"decision": "approve"})
    assert r.status_code == 403


def test_onboarding_task_and_branch(client, as_):
    wfs = client.get("/api/workflows", headers=as_("hrbp")).json()
    wid = next(w["id"] for w in wfs if w["name"] == "Employee Onboarding")
    inst = client.post("/api/instances", headers=as_("hrbp"), json={
        "workflow_id": wid, "variables": {"new_hire_name": "Meera", "department": "Sales"}}).json()
    decide(client, as_("director"), inbox(client, as_("director"))[0]["id"], "approve")
    task = inbox(client, as_("admin"))
    task = [t for t in task if t["kind"] == "task"]
    assert task[0]["title"] == "Set Up Laptop & Accounts"
    done = decide(client, as_("admin"), task[0]["id"], "complete")
    assert done["status"] == "completed"
    actions = [ev["data"].get("actionId") for ev in done["events"] if ev["event_type"] == "automation_run"]
    assert "create_ticket" not in actions  # GitHub access only for Engineering
    assert inst["variables"]["requester_name"] == "Rahul Mehta"


def test_running_request_keeps_old_version(client, as_):
    inst = start_leave(client, as_, 1)
    wid = inst["workflow_id"]
    wf = client.get(f"/api/workflows/{wid}", headers=as_("hrbp")).json()
    graph = wf["graph"]
    graph["nodes"][0]["data"]["title"] = "Leave Request v2"
    r = client.put(f"/api/workflows/{wid}", headers=as_("hrbp"),
                   json={"name": wf["name"], "description": "", "graph": graph})
    assert r.json()["version"] == 2
    done = decide(client, as_("manager"), inst["actions"][0]["id"], "approve")
    assert done["workflow_version"] == 1 and done["status"] == "completed"


def test_cancel(client, as_):
    inst = start_leave(client, as_, 1)
    assert client.post(f"/api/instances/{inst['id']}/cancel", headers=as_("manager")).status_code == 403
    r = client.post(f"/api/instances/{inst['id']}/cancel", headers=as_("employee"))
    assert r.json()["status"] == "failed"
    assert inbox(client, as_("manager")) == []


def test_sla_auto_approves(client, as_, db):
    inst = start_leave(client, as_, 1)
    action = db.get(PendingAction, inst["actions"][0]["id"])
    assert action.auto_approve_on_due  # Manager Approval has a 2-day SLA
    action.due_at = utcnow() - timedelta(minutes=1)
    db.commit()
    assert client.post("/api/admin/sweep-sla", headers=as_("employee")).status_code == 403
    assert client.post("/api/admin/sweep-sla", headers=as_("admin")).json() == {"auto_approved": 1}
    final = client.get(f"/api/instances/{inst['id']}", headers=as_("employee")).json()
    assert final["status"] == "completed"
    assert final["actions"][0]["status"] == ActionStatus.approved.value
    assert sweep_overdue_approvals(db) == 0


def test_simulate_matches_engine():
    r = simulate(LEAVE_REQUEST, {"days": 9})
    assert r["status"] == "success"
    labels = [s["nodeLabel"] for s in r["steps"]]
    assert "HR Approval (long leave)" in labels

    short = simulate(LEAVE_REQUEST, {"days": 1})
    assert "HR Approval (long leave)" not in [s["nodeLabel"] for s in short["steps"]]

    rejected = simulate(LEAVE_REQUEST, {"days": 1}, {"approval-1": "rejected"})
    assert rejected["steps"][-1]["message"] == "Leave request was declined."

    onboarding = simulate(ONBOARDING, {"department": "Engineering"})
    assert "Request GitHub Access" in [s["nodeLabel"] for s in onboarding["steps"]]
