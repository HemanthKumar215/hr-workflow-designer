# CLAUDE.md

Full-stack HR workflow engine: a React Flow designer (frontend) plus a FastAPI backend that executes workflows as real requests with role-based approvals. See README.md for the feature overview.

## Commands

```bash
# Backend (from backend/)
pip install -r requirements-dev.txt
uvicorn app.main:app --reload          # http://localhost:8000, docs at /docs; SQLite by default
pytest                                  # 34 tests; set DATABASE_URL=postgresql+psycopg://... to run on Postgres

# Frontend (from repo root)
npm install
VITE_API_URL=http://localhost:8000 npm run dev   # without VITE_API_URL it runs offline against src/services/mockApi.ts
npm run lint && npm run build                    # both must pass; CI runs them

# Postgres + API together
docker compose up --build
```

Demo accounts are seeded on first start (password `demo1234`): admin@, hrbp@, manager@, director@, employee@demo.com. Delete `backend/hr_workflow.db` to reset the local SQLite DB.

## Backend layout (`backend/app/`)

- `graph.py`: parses React Flow JSON into a `Graph`, validates it (start/end, cycles, reachability, conditions), and evaluates branch conditions safely via an `ast` whitelist. **Never use `eval()`** for conditions.
- `engine.py`: the `Executor` base class walks the graph; `DbExecutor` persists `PendingAction`s and `AuditEvent`s; `SimulationExecutor` resolves human steps instantly for dry runs. **Keep routing logic in the shared `Executor`** so simulation and real execution never diverge.
- `automations.py`: action catalogue and handler registry. Handlers are simulated; replace a handler to add a real integration. `{{variable}}` templating lives here.
- `models.py`: User, Workflow (versioned graph), WorkflowInstance (stores a graph *snapshot* at start), PendingAction, AuditEvent.
- `auth.py`: bcrypt + JWT; `Designer` (admin/hrbp) and `Admin` dependency guards.
- `routers/`: `auth.py`, `workflows.py` (CRUD, `/validate`, `/simulate`, `/automations`), `instances.py` (requests, inbox, decide, cancel, stats, SLA sweep).
- `seed.py`: demo users and the Leave Request / Employee Onboarding templates.

## Engine rules (tests depend on these)

- Unconditional edges are always followed; conditional edges when true; an `else` edge only when no other condition matched.
- On an approval **rejection**, only edges whose condition references `outcome` are followed; with none, the instance becomes `rejected`.
- Approvers can't decide their own request (admins excepted). Tasks resolve the assignee from email, full name, role name, or blank (= requester).
- `autoApproveThreshold` (days) on an approval sets `due_at`; `sweep_overdue_approvals` auto-approves overdue steps (background loop in `main.py`, or `POST /api/admin/sweep-sla`).
- Updating a workflow bumps `version` only if the graph changed; running instances keep their snapshot.

## Frontend layout (`src/`)

- `services/http.ts` (fetch + JWT, `isBackendEnabled`) and `services/api.ts` (all endpoints; falls back to the mock when offline).
- `hooks/useWorkflowState.ts`: canvas state, edge conditions (`edge.data.condition` plus label styling).
- `components/Canvas`, `NodeForms` (incl. `EdgeConditionForm`), `Sandbox` (simulator), `Requests` (inbox, detail, progress graph), `Auth`.
- Styling is inline style objects with shared tokens in `components/ui/styles.ts`; keep the existing dark theme.
- Node data types in `types/node.types.ts` carry `[key: string]: unknown` index signatures so they satisfy React Flow's `Record` constraint. Don't remove them or the build breaks.

## Conventions

- Add a pytest test for any engine or permission change (`backend/tests/test_engine.py`, `test_api.py`).
- New backend dependencies go in `backend/requirements.txt` with a pinned version. CI installs from a clean environment, so anything only installed locally will fail there.
- API timestamps are serialized as UTC (`UTCDateTime` in `schemas.py`) because SQLite drops timezone info.
- Write small, focused commits with descriptive messages.
