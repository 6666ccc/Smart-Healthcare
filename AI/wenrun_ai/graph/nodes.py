"""Small, dependency-injected helpers used by :mod:`wenrun_ai.graph.workflow`."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage

from wenrun_ai.chains.router import Intent


def normalize_conversation_id(value: str | None) -> str:
    """规范化会话 ID，返回一个稳定的 LangGraph 线程 ID 用于每个 incoming conversation。"""
    if value and value.strip():
        return value.strip()
    return "default"


def scoped_thread_id(conversation_id: str, user_id: int | None) -> str:
    """内部检查点键；从不向客户端暴露主要标识符。"""
    principal = "anonymous" if user_id is None else f"user-{user_id}"
    return f"{principal}:{conversation_id}"


def result_reply(result: Any) -> str | None:
    """从代理运行器返回的结果形状中提取文本回复。"""
    if isinstance(result, dict):
        reply = result.get("reply")
        if isinstance(reply, str):
            return reply.strip() or None
        for message in reversed(result.get("messages", [])):
            if isinstance(message, AIMessage) and message.content:
                return str(message.content).strip() or None
    return None


def knowledge_base_for(intent: Intent):
    # 保留在这里以使图路由显式，同时保留 qa 作为用于传统调用者的映射的真相来源。
    # 用于传统调用者的映射的真相来源。
    from wenrun_ai.chains.qa import knowledge_base_for_intent

    return knowledge_base_for_intent(intent)
