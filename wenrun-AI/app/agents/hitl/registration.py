"""
[HITL] 挂号 Agent — 含 HumanInTheLoopMiddleware 的 create_agent 封装。

写操作（create_registration / pay_charge）触发中断，由 /java/chat/resume 恢复执行。
"""

from __future__ import annotations

import logging
from typing import Any

from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from app.agents.hitl.common import format_hitl_agent_result, hitl_run_config
from app.agents.llm import MODEL
from app.agents.router.prompts import build_registration_system_prompt
from app.tools import PATIENT_ALL_TOOLS

logger = logging.getLogger(__name__)

# ========== [HITL] Checkpointer：中断状态持久化（开发用内存；生产请换 Postgres 等） ==========
_HITL_CHECKPOINTER = InMemorySaver()


# ========== [HITL] 中断策略：哪些工具需要人工 approve / reject / edit ==========
_HITL_INTERRUPT_ON = {
    "create_registration": {
        "allowed_decisions": ["approve", "reject", "edit"],
        "description": "提交挂号",
    },
    "pay_charge": {
        "allowed_decisions": ["approve", "reject", "edit"],
        "description": "确认支付",
    },
}


def _build_hitl_registration_agent():
    """[HITL] 创建带 HumanInTheLoopMiddleware 的 Agent（模块级单例）。"""
    return create_agent(
        model=MODEL,
        tools=PATIENT_ALL_TOOLS,
        middleware=[
            HumanInTheLoopMiddleware(
                interrupt_on=_HITL_INTERRUPT_ON,
                description_prefix="",
            )
        ],
        checkpointer=_HITL_CHECKPOINTER,
    )


# ========== [HITL] 模块级 Agent 单例（checkpointer 必须在请求间复用） ==========
_REGISTRATION_HITL_AGENT = _build_hitl_registration_agent()


def run_registration_with_hitl(
    *,
    user_input: str,
    memory_context: str | None,
    session_id: str | None,
    user_id: str | None,
) -> dict[str, Any]:
    """[HITL] 首次调用：用户发消息 → Agent 运行，可能在写操作前中断。"""
    config = hitl_run_config(session_id, user_id)
    thread_id = config["configurable"]["thread_id"]
    prompt = build_registration_system_prompt(memory_context)

    logger.info("[HITL] run | thread_id=%s user_input=%r", thread_id, user_input)
    result = _REGISTRATION_HITL_AGENT.invoke(
        {
            "messages": [
                SystemMessage(content=prompt),
                HumanMessage(content=user_input),
            ]
        },
        config=config,
    )
    return format_hitl_agent_result(result, thread_id)


def resume_registration_with_hitl(
    *,
    session_id: str | None,
    user_id: str | None,
    decisions: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    [HITL] 恢复调用：前端回传用户决策后，从中断点继续执行。

    decisions 示例::
        [{"type": "approve"}]
        [{"type": "reject", "message": "用户取消"}]
        [{"type": "edit", "edited_action": {"name": "create_registration", "args": {...}}}]
    """
    if not decisions:
        raise ValueError("[HITL] decisions 不能为空")

    config = hitl_run_config(session_id, user_id)
    thread_id = config["configurable"]["thread_id"]

    logger.info("[HITL] resume | thread_id=%s decisions=%s", thread_id, decisions)
    result = _REGISTRATION_HITL_AGENT.invoke(
        Command(resume={"decisions": decisions}),
        config=config,
    )
    return format_hitl_agent_result(result, thread_id)
