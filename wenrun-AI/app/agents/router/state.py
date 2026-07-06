from typing import Optional, TypedDict

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
