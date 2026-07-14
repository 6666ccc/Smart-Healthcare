"""Public HTTP contract for graph-backed chat and HITL resumption."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient


# Keep this test runnable directly from the repository root.
AI_ROOT = Path(__file__).resolve().parents[2]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from wenrun_ai.API.routers import chat


def client() -> TestClient:
    app = FastAPI()
    app.include_router(chat.router, prefix="/v1")
    return TestClient(app)


def execution(*, status="completed", reply="hello", conversation_id="a", interrupts=None):
    return SimpleNamespace(
        status=status,
        reply=reply,
        conversation_id=conversation_id,
        interrupts=interrupts or [],
    )


def test_chat_returns_pending_hitl_contract(monkeypatch):
    interrupt = {"type": "approve", "tool": "create_registration"}
    monkeypatch.setattr(
        chat,
        "run_chat_execution",
        lambda _message, **_kwargs: execution(status="pending", reply=None, interrupts=[interrupt]),
    )

    response = client().post(
        "/v1/chat",
        json={"message": "帮我挂号", "conversationId": "a", "apiKey": "secret"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "reply": None,
        "status": "pending",
        "conversationId": "a",
        "interrupts": [interrupt],
    }


def test_chat_returns_completed_reply(monkeypatch):
    monkeypatch.setattr(chat, "run_chat_execution", lambda _message, **_kwargs: execution(reply="已为您查询"))

    response = client().post("/v1/chat", json={"message": "查询", "conversationId": "a"})

    assert response.status_code == 200
    assert response.json() == {
        "reply": "已为您查询",
        "status": "completed",
        "conversationId": "a",
        "interrupts": [],
    }


def test_resume_uses_request_principal_and_returns_completed_execution(monkeypatch):
    calls = []

    def resume(conversation_id, decision, *, user_id=None, api_key=None):
        calls.append((conversation_id, decision, user_id, api_key))
        return execution(reply="挂号已确认")

    monkeypatch.setattr(chat, "resume_chat_execution", resume)

    response = client().post(
        "/v1/chat/resume",
        json={
            "conversationId": "a",
            "decision": {"type": "approve"},
            "userId": 7,
            "apiKey": "secret",
        },
    )

    assert response.status_code == 200
    assert response.json()["reply"] == "挂号已确认"
    assert calls == [("a", {"type": "approve"}, 7, "secret")]


def test_stream_pending_emits_interrupt_without_done(monkeypatch):
    interrupt = {"type": "approve", "tool": "create_registration"}
    monkeypatch.setattr(
        chat,
        "run_chat_execution",
        lambda _message, **_kwargs: execution(status="pending", reply=None, interrupts=[interrupt]),
    )

    response = client().post("/v1/chat/stream", json={"message": "帮我挂号", "conversationId": "a"})

    assert response.status_code == 200
    events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]
    assert events == [{"type": "interrupt", "conversationId": "a", "interrupts": [interrupt]}]


def test_stream_completed_emits_done(monkeypatch):
    monkeypatch.setattr(chat, "run_chat_execution", lambda _message, **_kwargs: execution(reply="完成"))

    response = client().post("/v1/chat/stream", json={"message": "查询", "conversationId": "a"})

    events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]
    assert events == [{"type": "done", "reply": "完成", "conversationId": "a"}]


def test_resume_missing_checkpoint_is_a_client_error(monkeypatch):
    def resume(*_args, **_kwargs):
        raise LookupError("missing workflow")

    monkeypatch.setattr(chat, "resume_chat_execution", resume)

    response = client().post(
        "/v1/chat/resume",
        json={"conversationId": "missing", "decision": {"type": "approve"}},
    )

    assert response.status_code in {404, 409}
    assert "missing workflow" not in response.text
