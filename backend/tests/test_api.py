from app.seed import LEAVE_REQUEST


def test_health_and_auth(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/workflows").status_code == 401
    bad = client.post("/api/auth/login", json={"email": "admin@demo.com", "password": "nope"})
    assert bad.status_code == 401
    assert len(client.get("/api/auth/demo-accounts").json()) == 5


def test_me(client, as_):
    me = client.get("/api/auth/me", headers=as_("manager")).json()
    assert me["role"] == "manager" and me["full_name"] == "Priya Sharma"


def test_workflow_crud_and_roles(client, as_):
    body = {"name": "Copy", "description": "x", "graph": LEAVE_REQUEST}
    assert client.post("/api/workflows", headers=as_("employee"), json=body).status_code == 403
    r = client.post("/api/workflows", headers=as_("hrbp"), json=body)
    assert r.status_code == 201
    wf = r.json()
    assert wf["form_fields"] == ["leave_type", "days", "reason"]

    # unchanged graph doesn't bump the version
    same = client.put(f"/api/workflows/{wf['id']}", headers=as_("hrbp"), json={**body, "name": "Renamed"}).json()
    assert same["version"] == 1 and same["name"] == "Renamed"

    bad = {"name": "Broken", "graph": {"nodes": [], "edges": []}}
    r = client.post("/api/workflows", headers=as_("admin"), json=bad)
    assert r.status_code == 422 and r.json()["detail"]["issues"]

    assert client.delete(f"/api/workflows/{wf['id']}", headers=as_("admin")).status_code == 204
    assert client.get(f"/api/workflows/{wf['id']}", headers=as_("admin")).status_code == 404


def test_simulate_endpoint_matches_frontend_contract(client):
    r = client.post("/api/simulate", json={**LEAVE_REQUEST, "variables": {"days": 7}}).json()
    assert r["status"] == "success"
    assert set(r) >= {"status", "steps", "validationErrors", "executionTimeMs"}
    assert set(r["steps"][0]) >= {"nodeId", "nodeType", "nodeLabel", "status", "message", "timestamp"}

    broken = client.post("/api/simulate", json={"nodes": [], "edges": []}).json()
    assert broken["status"] == "failure" and broken["validationErrors"]


def test_stats(client, as_):
    wid = client.get("/api/workflows", headers=as_("employee")).json()[0]["id"]
    client.post("/api/instances", headers=as_("employee"), json={"workflow_id": wid, "variables": {"days": 1}})
    assert client.get("/api/stats", headers=as_("employee")).status_code == 403
    s = client.get("/api/stats", headers=as_("hrbp")).json()
    assert s["total"] == 1 and s["open_actions"] >= 1


def test_instance_scopes(client, as_):
    wid = client.get("/api/workflows", headers=as_("employee")).json()[0]["id"]
    client.post("/api/instances", headers=as_("employee"), json={"workflow_id": wid, "variables": {"days": 1}})
    assert len(client.get("/api/instances", headers=as_("employee")).json()) == 1
    assert client.get("/api/instances", headers=as_("manager")).json() == []
    assert len(client.get("/api/instances?scope=all", headers=as_("hrbp")).json()) == 1
    # employees asking for "all" still only see their own
    assert client.get("/api/instances?scope=all", headers=as_("director")).json() == []
