from typing import Any, Optional, TypedDict

from langchain_core.messages import BaseMessage


class RouterState(TypedDict):
    messages: list[BaseMessage]
    user_input: str
    user_id: Optional[str]
    session_id: Optional[str]
    intent: Optional[str]
    target_agent: Optional[str]
    confidence: Optional[float]
    reasoning: Optional[str]
    memory_context: Optional[str]
    final_output: Optional[str]
    # [HITL] 以下字段仅在 registration_agent 触发人工确认时有值
    hitl_status: Optional[str]
    hitl_thread_id: Optional[str]
    hitl_pending_actions: Optional[list[dict[str, Any]]]
