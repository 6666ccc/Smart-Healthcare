"""Small, dependency-injected helpers used by :mod:`wenrun_ai.graph.workflow`."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage

from wenrun_ai.chains.router import Intent


def normalize_conversation_id(value: str | None) -> str:
    """Return a stable LangGraph thread id for every incoming conversation."""
    if value and value.strip():
        return value.strip()
    return "default"


def scoped_thread_id(conversation_id: str, user_id: int | None) -> str:
    """Internal checkpoint key; never expose a principal identifier to clients."""
    principal = "anonymous" if user_id is None else f"user-{user_id}"
    return f"{principal}:{conversation_id}"


def result_reply(result: Any) -> str | None:
    """Extract a textual reply from the result shape returned by an agent runner."""
    if isinstance(result, dict):
        reply = result.get("reply")
        if isinstance(reply, str):
            return reply.strip() or None
        for message in reversed(result.get("messages", [])):
            if isinstance(message, AIMessage) and message.content:
                return str(message.content).strip() or None
    return None


def knowledge_base_for(intent: Intent):
    # Kept here to make graph routing explicit while retaining qa as the source
    # of truth for the mapping used by legacy callers.
    from wenrun_ai.chains.qa import knowledge_base_for_intent

    return knowledge_base_for_intent(intent)
