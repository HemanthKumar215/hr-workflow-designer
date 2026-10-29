from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import CurrentUser, Designer
from ..automations import ACTION_IDS, AUTOMATIONS
from ..database import get_db
from ..engine import simulate
from ..graph import Graph, has_errors, validate_graph
from ..models import Workflow
from ..schemas import GraphIn, SimulateIn, SimulationOut, ValidationIssue, WorkflowIn, WorkflowOut, WorkflowSummary

router = APIRouter(prefix="/api", tags=["workflows"])
DB = Annotated[Session, Depends(get_db)]


def _form_fields(graph: dict) -> list[str]:
    g = Graph.from_json(graph)
    starts = g.start_nodes()
    if not starts:
        return []
    return [str(kv.get("key")).strip() for kv in g.data(starts[0]).get("metadata") or [] if str(kv.get("key") or "").strip()]


def _summary(wf: Workflow, full: bool = False):
    base = dict(id=wf.id, name=wf.name, description=wf.description, version=wf.version, updated_at=wf.updated_at,
                node_count=len(wf.graph.get("nodes", [])), form_fields=_form_fields(wf.graph))
    if full:
        return WorkflowOut(**base, graph=wf.graph, created_at=wf.created_at)
    return WorkflowSummary(**base)


def _get(db: Session, workflow_id: int) -> Workflow:
    wf = db.get(Workflow, workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


def _check(graph: GraphIn) -> None:
    issues = validate_graph(graph.model_dump(), ACTION_IDS)
    if has_errors(issues):
        raise HTTPException(status_code=422, detail={"message": "Workflow has validation errors", "issues": issues})


@router.get("/automations")
def list_automations():
    return AUTOMATIONS


@router.post("/validate", response_model=list[ValidationIssue])
def validate(graph: GraphIn):
    return validate_graph(graph.model_dump(), ACTION_IDS)


@router.post("/simulate", response_model=SimulationOut)
def simulate_workflow(body: SimulateIn):
    """Dry-run a graph with the real engine. Human steps resolve instantly."""
    import time

    t0 = time.perf_counter()
    graph = {"nodes": body.nodes, "edges": body.edges}
    issues = validate_graph(graph, ACTION_IDS)
    if has_errors(issues):
        return SimulationOut(status="failure", steps=[], validationErrors=issues, executionTimeMs=0)
    result = simulate(graph, body.variables, body.decisions)
    return SimulationOut(**result, validationErrors=issues,
                         executionTimeMs=round((time.perf_counter() - t0) * 1000))


@router.get("/workflows", response_model=list[WorkflowSummary])
def list_workflows(db: DB, _: CurrentUser):
    return [_summary(w) for w in db.scalars(select(Workflow).order_by(Workflow.updated_at.desc()))]


@router.post("/workflows", response_model=WorkflowOut, status_code=201)
def create_workflow(body: WorkflowIn, db: DB, user: Designer):
    _check(body.graph)
    wf = Workflow(name=body.name, description=body.description, graph=body.graph.model_dump(), created_by_id=user.id)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _summary(wf, full=True)


@router.get("/workflows/{workflow_id}", response_model=WorkflowOut)
def get_workflow(workflow_id: int, db: DB, _: CurrentUser):
    return _summary(_get(db, workflow_id), full=True)


@router.put("/workflows/{workflow_id}", response_model=WorkflowOut)
def update_workflow(workflow_id: int, body: WorkflowIn, db: DB, _: Designer):
    wf = _get(db, workflow_id)
    _check(body.graph)
    wf.name, wf.description = body.name, body.description
    new_graph = body.graph.model_dump()
    if new_graph != wf.graph:
        wf.graph = new_graph
        wf.version += 1  # running requests keep their own snapshot of the old version
    db.commit()
    db.refresh(wf)
    return _summary(wf, full=True)


@router.delete("/workflows/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: int, db: DB, _: Designer):
    db.delete(_get(db, workflow_id))
    db.commit()
    return Response(status_code=204)
