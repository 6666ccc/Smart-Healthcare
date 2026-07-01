import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.hitl import run_registration_with_hitl
from app.agents.llm import MODEL
from app.agents.router.prompts import (
    build_chat_system_prompt,
    build_intent_prompt,
    build_medical_system_prompt,
)
from app.agents.router.state import RouterState
from app.memory import MemoryStore, format_memory_context

logger = logging.getLogger(__name__)


def _message_text(message) -> str:
    content = getattr(message, "content", "") or ""
    if isinstance(content, str):
        return content.strip()
    return str(content).strip()


def retrieve_memory(state: RouterState) -> dict:
    user_id = state.get("user_id")
    if not user_id:
        return {"memory_context": None}

    try:
        store = MemoryStore()
        session_history = store.get_session_history(
            session_id=state.get("session_id") or "",
            user_id=user_id,
            limit=20,
        )
        relevant = store.retrieve_relevant(user_id=user_id, query=state["user_input"], top_k=5)
        context = format_memory_context(session_history=session_history, relevant_memories=relevant)
        return {"memory_context": context}
    except Exception as exc:
        logger.warning("记忆检索失败，跳过 | user_id=%s error=%s", user_id, exc)
        return {"memory_context": None}


def store_memory(state: RouterState) -> dict:
    user_id = state.get("user_id")
    if not user_id:
        return {}

    try:
        store = MemoryStore()
        session_id = state.get("session_id") or "unknown"
        intent = state.get("intent") or "chat"

        store.store_memory(
            user_id=user_id,
            session_id=session_id,
            content=state["user_input"],
            message_type="user",
            intent=intent,
        )
        final_output = state.get("final_output") or ""
        if final_output:
            store.store_memory(
                user_id=user_id,
                session_id=session_id,
                content=final_output,
                message_type="assistant",
                intent=intent,
            )
    except Exception as exc:
        logger.warning("记忆存储失败 | user_id=%s error=%s", user_id, exc)
    return {}


def analyze_intent(state: RouterState) -> dict:
    memory_context = state.get("memory_context")
    messages = [
        SystemMessage(content=build_intent_prompt(memory_context)),
        HumanMessage(content=state["user_input"]),
    ]
    response = MODEL.invoke(messages)
    parsed = _parse_json_from_llm(_message_text(response))

    return {
        "messages": [response],
        "intent": parsed.get("intention", "chat"),
        "target_agent": parsed.get("target_agent", "chat_agent"),
        "confidence": float(parsed.get("confidence", 0)),
        "reasoning": parsed.get("reasoning", ""),
        "final_output": None,
    }


def _run_chat(system_prompt: str, user_input: str) -> dict:
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_input)]
    response = MODEL.invoke(messages)
    return {"messages": [response], "final_output": _message_text(response)}


def medical_agent(state: RouterState) -> dict:
    prompt = build_medical_system_prompt(state.get("memory_context"))
    return _run_chat(prompt, state["user_input"])


def chat_agent(state: RouterState) -> dict:
    prompt = build_chat_system_prompt(state.get("memory_context"))
    return _run_chat(prompt, state["user_input"])


def registration_agent(state: RouterState) -> dict:
    """[HITL] 挂号 Agent 节点：写操作前会中断，等待 /java/chat/resume。"""
    hitl_result = run_registration_with_hitl(
        user_input=state["user_input"],
        memory_context=state.get("memory_context"),
        session_id=state.get("session_id"),
        user_id=state.get("user_id"),
    )
    return {
        "final_output": hitl_result.get("final_output"),
        "hitl_status": hitl_result.get("hitl_status"),
        "hitl_thread_id": hitl_result.get("hitl_thread_id"),
        "hitl_pending_actions": hitl_result.get("hitl_pending_actions"),
    }


def fallback(state: RouterState) -> dict:
    return {"final_output": "您好，我没有完全理解您的意思。"}


def decide_next_node(state: RouterState) -> str:
    confidence = state.get("confidence")
    agent = state.get("target_agent", "")

    if confidence is None or confidence < 0.5:
        return "fallback"
    if agent in ("medical_agent", "registration_agent", "chat_agent"):
        return agent
    return "fallback"


def _parse_json_from_llm(raw: str) -> dict:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if match:
        raw = match.group(1).strip()

    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}
