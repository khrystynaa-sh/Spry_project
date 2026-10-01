import os

os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

VALID = {
    "title": "Sprint planning",
    "starts_at": "2026-10-01T09:00:00Z",
    "ends_at": "2026-10-01T10:00:00Z",
    "attendee_count": 8,
}


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_is_empty_initially(client):
    response = client.get("/api/meetings")
    assert response.status_code == 200
    assert response.json() == []


def test_create_then_list(client):
    created = client.post("/api/meetings", json=VALID)
    assert created.status_code == 201
    body = created.json()
    assert isinstance(body["id"], int)
    assert body["title"] == VALID["title"]
    assert body["attendee_count"] == 8

    listed = client.get("/api/meetings").json()
    assert [m["id"] for m in listed] == [body["id"]]


def test_rejects_end_before_start(client):
    bad = {**VALID, "ends_at": "2026-10-01T08:00:00Z"}
    assert client.post("/api/meetings", json=bad).status_code == 422


def test_rejects_invalid_fields(client):
    assert client.post("/api/meetings", json={**VALID, "title": ""}).status_code == 422
    assert client.post("/api/meetings", json={**VALID, "attendee_count": -1}).status_code == 422
    assert client.post("/api/meetings", json={**VALID, "starts_at": "nope"}).status_code == 422
