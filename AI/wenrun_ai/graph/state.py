"""State and public result models for the chat orchestration graph."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, TypedDict

from wenrun_ai.chains.router import Intent


@dataclass(frozen=True)
class ChatInput:
    message: str
    conversation_id: str | None = None
    api_key: str | None = None
    user_id: int | None = None
    patient_id: int | None = None
    user_context: str | None = None


@dataclass(frozen=True)
class ChatExecution:
    status: Literal["completed"]
    conversation_id: str
    reply: str | None = None
    intent: Intent | None = None


class ChatState(TypedDict, total=False):
    message: str
    conversation_id: str
    thread_id: str
    api_key: str | None
    user_id: int | None
    patient_id: int | None
    user_context: str | None
    memories_block: str | None
    profile_block: str | None
    intent: Intent
    knowledge_context: str | None
    human_message: Any
    reply: str | None
    status: Literal["completed"]
