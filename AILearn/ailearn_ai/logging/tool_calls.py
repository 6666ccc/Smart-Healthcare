"""记录 AI Agent 调用了哪些 Tool。"""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import AIMessage, ToolMessage

logger = logging.getLogger("ailearn_ai.tools")

_MAX_LEN = 500


def _truncate(text: str, max_len: int = _MAX_LEN) -> str:
    text = text.replace("\n", " ").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _format_tool_input(tool_input: Any) -> str:
    if tool_input is None:
        return ""
    if isinstance(tool_input, str):
        return _truncate(tool_input)
    try:
        return _truncate(json.dumps(tool_input, ensure_ascii=False, default=str))
    except (TypeError, ValueError):
        return _truncate(str(tool_input))


class ToolCallCallbackHandler(BaseCallbackHandler):
    """LangChain 回调：在工具执行开始/结束/失败时写日志。"""

    def __init__(self) -> None:
        super().__init__()
        self._run_tool_names: dict[UUID, str] = {}

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        inputs: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        name = serialized.get("name") or kwargs.get("name") or "unknown"
        self._run_tool_names[run_id] = name
        payload = input_str or (inputs and _format_tool_input(inputs)) or ""
        logger.info("AI 调用工具开始 | tool=%s | input=%s", name, payload or "(空)")

    def on_tool_end(
        self,
        output: Any,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        name = self._run_tool_names.pop(run_id, "unknown")
        logger.info(
            "AI 调用工具结束 | tool=%s | output=%s",
            name,
            _truncate(str(output)),
        )

    def on_tool_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        name = self._run_tool_names.pop(run_id, "unknown")
        logger.error("AI 调用工具失败 | tool=%s | error=%s", name, error)


def log_tool_calls_from_messages(messages: list) -> list[str]:
    """从 Agent 返回的消息列表中提取并记录工具调用，返回工具名列表。"""
    called: list[str] = []

    for msg in messages:
        if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                if isinstance(tc, dict):
                    name = tc.get("name", "unknown")
                    args = tc.get("args", {})
                else:
                    name = getattr(tc, "name", "unknown")
                    args = getattr(tc, "args", {})
                logger.info(
                    "AI 规划工具调用 | tool=%s | args=%s",
                    name,
                    _format_tool_input(args),
                )
                called.append(name)

        elif isinstance(msg, ToolMessage):
            name = msg.name or "unknown"
            logger.info(
                "AI 工具返回 | tool=%s | result=%s",
                name,
                _truncate(str(msg.content)),
            )
            if name not in called:
                called.append(name)

    if called:
        logger.info(
            "本轮工具调用汇总 (%d) | %s",
            len(called),
            " -> ".join(called),
        )
    else:
        logger.info("本轮未调用任何工具")

    return called
