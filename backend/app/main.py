import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, SessionLocal, engine
from .engine import sweep_overdue_approvals
from .routers import auth, instances, workflows
from .seed import seed

log = logging.getLogger("hr_workflow")


async def _sla_loop(interval: int) -> None:
    """Periodically auto-approve approvals whose SLA has expired."""
    while True:
        await asyncio.sleep(interval)
        try:
            with SessionLocal() as db:
                n = await asyncio.to_thread(sweep_overdue_approvals, db)
            if n:
                log.info("SLA sweep auto-approved %d step(s)", n)
        except Exception:  # keep the loop alive; log and retry next tick
            log.exception("SLA sweep failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed(db)
    task = None
    if settings.sla_sweep_interval_seconds > 0:
        task = asyncio.create_task(_sla_loop(settings.sla_sweep_interval_seconds))
    yield
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(
    title="HR Workflow Engine API",
    description="Design HR workflows, run them as real requests, and route tasks and approvals by role.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workflows.router)
app.include_router(instances.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
