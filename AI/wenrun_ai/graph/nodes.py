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


def result_interrupts(result: Any) -> list[dict[str, Any]]:
    """适配可注入的和 LangChain HITL 中断到 UI 负载。"""
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
                # HumanInTheLoopMiddleware 发出一个 HITLRequest，包含多个 action_requests/review_configs。
                # 保留每个受保护写操作的稳定 UI 表示。
                # UI 表示每个受保护写操作。
                review_configs = {
                    config.get("action_name"): config.get("allowed_decisions")
                    for config in value.get("review_configs", [])
                    if isinstance(config, dict)
                    and isinstance(config.get("action_name"), str)
                }
                for action in value["action_requests"]:
                    if isinstance(action, dict) and isinstance(action.get("name"), str):
                        adapted.append(
                            {
                                "tool": action["name"],
                                "args": action.get("args", {}),
                                "allowedDecisions": review_configs.get(action["name"]),
                            }
                        )
            elif isinstance(value.get("action_request"), dict):
                action = value["action_request"]
                adapted.append(
                    {"tool": action.get("name"), "args": action.get("args", {})}
                )
            elif isinstance(value.get("interrupts"), list):
                adapted.extend(
                    part for part in value["interrupts"] if isinstance(part, dict)
                )
    return adapted


def knowledge_base_for(intent: Intent):
    # 保留在这里以使图路由显式，同时保留 qa 作为用于传统调用者的映射的真相来源。
    # 用于传统调用者的映射的真相来源。
    from wenrun_ai.chains.qa import knowledge_base_for_intent

    return knowledge_base_for_intent(intent)
