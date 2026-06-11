"""HuiLiao 医疗问答 Agent：LLM + 全部后端 Tools。"""

from __future__ import annotations

import argparse
import logging
import sys
import warnings

from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent

from ailearn_ai.logging import (
    ToolCallCallbackHandler,
    log_tool_calls_from_messages,
    setup_logging,
)
from ailearn_ai.auth_context import huiliao_api_context
from ailearn_ai.settings import base
from ailearn_ai.tools import get_all_tools
from ailearn_ai.memory import (
    add_memory_pair,
    format_memories_for_prompt,
    search_memories,
)

chat_logger = logging.getLogger("ailearn_ai.chat")

SYSTEM_PROMPT = """你是 HuiLiao 慧疗医院管理系统的智能医疗助手。

若用户消息前附带 <current_user> 块，表示 Java 网关已解析登录身份并注入上下文：
- 患者门户：patientId 等字段可信，优先用于查本人档案/挂号/处方，勿重复索要。
- 医生门户：staffId 标识当前医生，查患者需另指 patientId 或先搜索。
- 管理员：无绑定患者，按管理场景作答。

称呼规则（用于让回复更亲近、更符合上下文）：
- 如果 <current_user> 块中提供了 `patientName` / `realName` / `username`，回复时优先用其中最可靠的名字称呼用户；
  常见优先级：patientName > realName > username。
- 如果上述字段缺失或为 null，则一律使用“您”称呼，不要反问/重复索要姓名。

你可以通过工具查询和操作后端业务数据，涵盖：
- 基础信息：科室、医生、排班、医疗项目价目、药品与库存、今日统计
- 患者：按姓名/手机/身份证查询、查看档案、新建档案
- 门诊流程：挂号、取消挂号、开始/完成接诊、检查申请、开处方、生成收费单、支付、发药

使用原则：
1. 先理解用户意图，再选择合适工具；缺少 ID 时先用列表或搜索类工具获取。
2. 写操作（挂号、开方、支付、发药等）前确认关键参数（患者、排班、金额等）。
3. 工具返回 JSON 或错误信息时，用简洁中文总结；不要编造未返回的数据。
4. 日期参数使用 ISO 格式，例如 2026-05-23。"""

_agent = None


def build_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=base.get_chat_model_name(),
        temperature=0.3,
        api_key=base.get_openai_api_key(),
        base_url=base.get_openai_base_url(),
    )


def build_agent():
    """构建 ReAct Agent，注册全部 HuiLiao 后端 Tools。"""
    llm = build_llm()
    tools = get_all_tools()
    return create_agent(
        llm,
        tools,
        system_prompt=SYSTEM_PROMPT,
        name="huiliao_medical_assistant",
    )


def get_agent():
    """懒加载单例 Agent，避免重复编译图。"""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent


def _extract_reply(messages: list) -> str:
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            content = msg.content
            if isinstance(content, str):
                return content.strip()
            if isinstance(content, list):
                parts = [
                    block.get("text", "")
                    for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                ]
                text = "".join(parts).strip()
                if text:
                    return text
            return str(content).strip()
    return "抱歉，未能生成有效回复，请换个方式提问或稍后重试。"


def _build_human_message(
    message: str,
    user_context: str | None,
    memories_block: str | None,
) -> HumanMessage:
    """构造 HumanMessage，将用户上下文和记忆注入在用户问题前面。"""
    parts: list[str] = []

    if memories_block:
        parts.append(memories_block)

    if user_context:
        parts.append(user_context)

    parts.append(f"用户问题：{message}")

    return HumanMessage(content="\n\n---\n\n".join(parts))


def run_chat(
    message: str,
    *,
    api_key: str | None = None,
    user_id: int | None = None,
    user_context: str | None = None,
    conversation_id: str | None = None,
) -> str:
    """接收用户消息，调用 Agent（含全部 Tools）并返回助手回复。

    api_key: Java 注入的内部 API Key，工具回调 HuiLiao API 时写入 X-Api-Key 头。
    user_id: 当前用户 ID，工具回调 HuiLiao API 时写入 X-User-Id 头。
    user_context: 由 ChatRequest 格式化的 <current_user> 块；无则保持旧行为。
    conversation_id: 会话标识。非空时启用 Qdrant 语义记忆（检索+存储）；None 时保持无记忆行为。
    """
    use_memory = bool(conversation_id and conversation_id.strip())
    chat_logger.info(
        "用户提问 | %s | has_api_key=%s | has_user_id=%s | has_user_context=%s | use_memory=%s",
        message[:200] + ("..." if len(message) > 200 else ""),
        bool(api_key or base.get_huiliao_api_key()),
        user_id is not None,
        bool(user_context),
        use_memory,
    )

    # ── 检索记忆 ──
    memories_block: str | None = None
    if use_memory:
        memories = search_memories(conversation_id, message)
        memories_block = format_memories_for_prompt(memories)

    agent = get_agent()
    tool_handler = ToolCallCallbackHandler()

    with huiliao_api_context(api_key, user_id):
        result = agent.invoke(
            {"messages": [_build_human_message(message, user_context, memories_block)]},
            config={"callbacks": [tool_handler]},
        )

    log_tool_calls_from_messages(result["messages"])
    reply = _extract_reply(result["messages"])
    chat_logger.info("助手回复 | %s", reply[:200] + ("..." if len(reply) > 200 else ""))

    # ── 存储记忆 ──
    if use_memory:
        add_memory_pair(conversation_id, user_id, message, reply)

    return reply


def _cli() -> None:
    setup_logging()
    for category in (UserWarning, DeprecationWarning):
        warnings.filterwarnings("ignore", category=category, module="langgraph")

    parser = argparse.ArgumentParser(description="HuiLiao 医疗助手（ReAct Agent + 37 Tools）")
    parser.add_argument(
        "-m",
        "--message",
        help="单轮提问；省略则进入交互模式",
    )
    args = parser.parse_args()

    tool_count = len(get_all_tools())
    print(f"已加载 {tool_count} 个工具，正在初始化 Agent…", flush=True)
    get_agent()
    print("就绪。输入问题后回车（交互模式输入 quit 退出）。\n", flush=True)

    if args.message:
        print(run_chat(args.message))
        return

    while True:
        try:
            user_input = input("你: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n再见。")
            break
        if not user_input:
            continue
        if user_input.lower() in {"quit", "exit", "q"}:
            print("再见。")
            break
        print(f"\n助手: {run_chat(user_input)}\n", flush=True)


if __name__ == "__main__":
    if __package__ is None:
        from pathlib import Path

        root = Path(__file__).resolve().parents[2]
        if str(root) not in sys.path:
            sys.path.insert(0, str(root))
    _cli()
