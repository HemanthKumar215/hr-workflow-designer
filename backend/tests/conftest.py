import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ["SLA_SWEEP_INTERVAL_SECONDS"] = "0"
os.environ["SEED_DEMO_DATA"] = "true"
os.environ["JWT_SECRET"] = "test-secret-that-is-at-least-32-bytes-long"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.seed import DEMO_PASSWORD, seed


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed(session)
        yield session


@pytest.fixture()
def client(db):
    with TestClient(app) as c:
        yield c


def login(client: TestClient, who: str) -> dict[str, str]:
    r = client.post("/api/auth/login", json={"email": f"{who}@demo.com", "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def as_(client):
    cache: dict[str, dict[str, str]] = {}

    def _headers(who: str) -> dict[str, str]:
        if who not in cache:
            cache[who] = login(client, who)
        return cache[who]

    return _headers
