"""Public HTTP contract for graph-backed chat."""

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


def execution(*, status="completed", reply="hello", conversation_id="a"):
    return SimpleNamespace(
        status=status,
        reply=reply,
        conversation_id=conversation_id,
    )


def test_chat_returns_completed_reply(monkeypatch):
    monkeypatch.setattr(chat, "run_chat_execution", lambda _message, **_kwargs: execution(reply="已为您查询"))

    response = client().post("/v1/chat", json={"message": "查询", "conversationId": "a"})

    assert response.status_code == 200
    assert response.json() == {
        "reply": "已为您查询",
        "status": "completed",
        "conversationId": "a",
    }


def test_stream_completed_emits_done(monkeypatch):
    monkeypatch.setattr(chat, "run_chat_execution", lambda _message, **_kwargs: execution(reply="完成"))

    response = client().post("/v1/chat/stream", json={"message": "查询", "conversationId": "a"})

    events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]
    assert events == [{"type": "done", "reply": "完成", "conversationId": "a"}]
