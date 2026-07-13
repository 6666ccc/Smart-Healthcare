from fastapi import FastAPI
from fastapi.testclient import TestClient

from wenrun_ai.API.routers import knowledge
from wenrun_ai.knowledge.pipeline import IngestResult


def client() -> TestClient:
    app = FastAPI()
    app.include_router(knowledge.router, prefix="/v1")
    return TestClient(app)


def test_ingest_route_requires_internal_key(monkeypatch):
    monkeypatch.setattr(knowledge.base, "get_wenrun_api_key", lambda: "secret")

    response = client().post(
        "/v1/knowledge/ingest",
        data={
            "documentId": "doc-1",
            "knowledgeBase": "medical-general",
            "originalName": "guide.txt",
        },
        files={"file": ("guide.txt", b"content", "text/plain")},
        headers={"X-Api-Key": "wrong"},
    )

    assert response.status_code == 401


def test_ingest_route_returns_java_contract(monkeypatch):
    monkeypatch.setattr(knowledge.base, "get_wenrun_api_key", lambda: "secret")
    monkeypatch.setattr(
        knowledge,
        "ingest_document",
        lambda **kwargs: IngestResult(
            document_id=kwargs["document_id"],
            knowledge_base=kwargs["knowledge_base"],
            chunk_count=4,
        ),
    )

    response = client().post(
        "/v1/knowledge/ingest",
        data={
            "documentId": "doc-1",
            "knowledgeBase": "hospital-custom",
            "originalName": "map.md",
        },
        files={"file": ("map.md", b"hospital map", "text/markdown")},
        headers={"X-Api-Key": "secret"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "documentId": "doc-1",
        "knowledgeBase": "hospital-custom",
        "chunkCount": 4,
    }


def test_delete_route_is_scoped_and_idempotent(monkeypatch):
    calls = []
    monkeypatch.setattr(knowledge.base, "get_wenrun_api_key", lambda: "secret")
    monkeypatch.setattr(
        knowledge,
        "delete_document",
        lambda knowledge_base, document_id: calls.append((knowledge_base.value, document_id)),
    )

    response = client().delete(
        "/v1/knowledge/hospital-custom/doc-9",
        headers={"X-Api-Key": "secret"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "deleted",
        "documentId": "doc-9",
        "knowledgeBase": "hospital-custom",
    }
    assert calls == [("hospital-custom", "doc-9")]
