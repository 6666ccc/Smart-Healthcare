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


def result_interrupts(result: Any) -> list[dict[str, Any]]:
    """Adapt both injectable and LangChain HITL interrupts to UI payloads."""
    if not isinstance(result, dict):
        return []
    interrupts = result.get("interrupts") or result.get("__interrupt__") or []
    adapted: list[dict[str, Any]] = []
    for item in interrupts:
        value = getattr(item, "value", item)
        if isinstance(value, dict):
            if "tool" in value:
                adapted.append(value)
            elif isinstance(value.get("action_requests"), list):
                # HumanInTheLoopMiddleware emits one HITLRequest containing
                # plural action_requests/review_configs.  Keep only the stable
                # UI representation of each protected write action.
                review_configs = {
                    config.get("action_name"): config.get("allowed_decisions")
                    for config in value.get("review_configs", [])
                    if isinstance(config, dict) and isinstance(config.get("action_name"), str)
                }
                for action in value["action_requests"]:
                    if isinstance(action, dict) and isinstance(action.get("name"), str):
                        adapted.append({
                            "tool": action["name"],
                            "args": action.get("args", {}),
                            "allowedDecisions": review_configs.get(action["name"]),
                        })
            elif isinstance(value.get("action_request"), dict):
                action = value["action_request"]
                adapted.append({"tool": action.get("name"), "args": action.get("args", {})})
            elif isinstance(value.get("interrupts"), list):
                adapted.extend(part for part in value["interrupts"] if isinstance(part, dict))
    return adapted


def knowledge_base_for(intent: Intent):
    # Kept here to make graph routing explicit while retaining qa as the source
    # of truth for the mapping used by legacy callers.
    from wenrun_ai.chains.qa import knowledge_base_for_intent

    return knowledge_base_for_intent(intent)
