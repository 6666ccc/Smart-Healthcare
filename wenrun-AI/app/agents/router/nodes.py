import json
import logging
import re

from app.tools import PATIENT_ALL_TOOLS
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm import MODEL
from app.agents.router.hitl import (
    HITL_TOOL_POLICIES,
    build_hitl_config,
    extract_interrupt_dicts,
    extract_messages_from_result,
    format_hitl_decision,
    format_interrupts,
)
from app.agents.router.prompts import (
    build_chat_system_prompt,
    build_intent_prompt,
    build_medical_system_prompt,
)
from app.agents.router.state import RouterState
from app.memory import MemoryStore, format_memory_context
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, interrupt

logger = logging.getLogger(__name__)

# 带 HumanInTheLoopMiddleware 的工具 Agent。
# 输入：用户消息会以 {"messages": [HumanMessage(...)]} 的形式传入 TOOL_AGENT.invoke。
# 处理：当模型准备调用 create_registration 时，中间件先生成待确认 interrupt，而不是直接执行工具。
# 输出：没有中断时返回工具 Agent 的消息；有中断时返回 GraphOutput.interrupts，交给主图暂停。
TOOL_AGENT = create_agent(
    model=MODEL,
    tools=PATIENT_ALL_TOOLS,
    middleware=[
        HumanInTheLoopMiddleware(
            interrupt_on=HITL_TOOL_POLICIES,
        )
    ],
    checkpointer=InMemorySaver(),
)


def _message_text(message) -> str:
    """从 LangChain Message 对象中取出纯文本 content 并 strip。

    输入：任意带 .content 属性的消息对象（str 或非 str 均可）
    输出：strip 后的字符串；content 为空时返回 ""
    """
    # LangChain 的不同 Message 类型都有 content，但 content 可能不是字符串。
    # 这里先拿原始 content，再统一转成最终要给前端展示的纯文本。
    content = getattr(message, "content", "") or ""
    if isinstance(content, str):
        return content.strip()
    return str(content).strip()


def retrieve_memory(state: RouterState) -> dict:
    """路由图节点：按 user_id / session_id 检索记忆，供后续 Agent 注入上下文。

    输入：RouterState（user_id 为空则跳过）
    输出：{"memory_context": 格式化后的上下文字符串 | None}
    依赖：app.memory.MemoryStore、format_memory_context
    """
    # 第 1 步：没有 user_id 时无法按用户隔离记忆，直接跳过检索。
    user_id = state.get("user_id")
    if not user_id:
        return {
            "memory_context": None
        }

    try:
        # 第 2 步：从同一会话拿最近对话，再按用户问题做向量相似检索。
        # session_history 偏“上下文连续性”，relevant 偏“跨会话历史信息”。
        store = MemoryStore()

        session_history = store.get_session_history(
            session_id=state.get("session_id") or "",
            user_id=user_id,
            limit=20,
        )
        relevant = store.retrieve_relevant(
            user_id=user_id, query=state["user_input"], top_k=5
        )

        # 第 3 步：把两类记忆格式化成 prompt 可直接拼接的文本块。
        context = format_memory_context(
            session_history=session_history, relevant_memories=relevant
        )
        return {"memory_context": context}
    except Exception as exc:
        logger.warning("记忆检索失败，跳过 | user_id=%s error=%s", user_id, exc)
        return {
            "memory_context": None
        }


def store_memory(state: RouterState) -> dict:
    """路由图节点：将本轮 user_input 与 final_output 写入 MemoryStore。

    输入：RouterState（需 user_id；status 为 pending 时不写入，避免 HITL 未完成时落库）
    输出：{}（副作用为持久化记忆）
    """
    # 第 1 步：没有 user_id 就不能安全落库，否则不同用户的记忆会混在一起。
    user_id = state.get("user_id")
    if not user_id:
        return {}

    # 第 2 步：HITL 等用户确认时跳过记忆存储，避免把未完成的工具流程写入历史。
    if state.get("status") == "pending":
        return {}

    try:
        store = MemoryStore()
        session_id = state.get("session_id") or "unknown"
        intent = state.get("intent") or "chat"

        # 第 3 步：先保存用户问题，message_type=user 方便 format_memory_context 区分角色。
        store.store_memory(
            user_id=user_id,
            session_id=session_id,
            content=state["user_input"],
            message_type="user",
            intent=intent,
        )

        # 第 4 步：如果 Agent 生成了最终回答，再保存助手消息。
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

#TODO: 意图识别节点(将来可以引用结构化输出来实现)
def analyze_intent(state: RouterState) -> dict:
    """路由图节点：用 LLM 解析用户意图，决定 target_agent 与置信度。

    输入：RouterState（user_input、memory_context）
    输出：intent、target_agent、confidence、reasoning 等字段的 dict
    """
    # 第 1 步：把记忆上下文放进 system prompt，让意图识别能参考历史对话。
    memory_context = state.get("memory_context")
    messages = [
        SystemMessage(content=build_intent_prompt(memory_context)),
        HumanMessage(content=state["user_input"]),
    ]
    response = MODEL.invoke(messages)
    # 第 2 步：模型按 prompt 约定返回 JSON；这里容错解析，失败时使用默认 chat 路由。
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
    """调用 MODEL 完成一轮 System + Human 对话，返回助手回复文本。

    输入：system_prompt 系统提示词，user_input 用户消息
    输出：{"messages": [AIMessage], "final_output": str}
    """
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_input)]
    response = MODEL.invoke(messages)
    return {"messages": [response], "final_output": _message_text(response)}


def medical_agent(state: RouterState) -> dict:
    """路由图节点：医疗科普 Agent，使用医疗专用 system prompt + 记忆上下文。"""
    prompt = build_medical_system_prompt(state.get("memory_context"))
    return _run_chat(prompt, state["user_input"])


def chat_agent(state: RouterState) -> dict:
    """路由图节点：通用聊天 Agent，使用聊天 system prompt + 记忆上下文。"""
    prompt = build_chat_system_prompt(state.get("memory_context"))
    return _run_chat(prompt, state["user_input"])


def registration_agent(state: RouterState) -> dict:
    """路由图节点：调用带 HITL 的 TOOL_AGENT，检测是否需要人工确认。

    若有中断：保存到 _pending_interrupts 并在 interrupts 中也放一份（供 API 返回），
    由后续 handle_tool_hitl 节点负责调用 interrupt() 暂停主图。

    若无中断：直接返回 final_output + status=completed。
    """
    # 第 1 步：工具 Agent 也使用同一个 session_id 作为 thread_id。
    # 这样主图和工具 Agent 的 checkpoint 都能按会话隔离。
    config: RunnableConfig = build_hitl_config(state["session_id"])

    # 第 2 步：把用户输入交给带 HITL 中间件的工具 Agent。
    # version="v2" 的返回值中可能包含 interrupts。
    result = TOOL_AGENT.invoke(
        {"messages": [HumanMessage(content=state.get("user_input", ""))]},
        config=config,
        version="v2",
    )

    # 第 3 步：把 LangGraph 的 Interrupt 对象整理成前端可展示的 JSON。TODO: 将来考虑将这两个工具函数合并成一个工具函数
    interrupt_dicts = extract_interrupt_dicts(result) #提取中断内容
    formatted_interrupts = format_interrupts(interrupt_dicts) #整理成前端可展示的JSON

    if len(formatted_interrupts) > 0:
        # 第 4A 步：有中断时，主图不能继续执行工具。
        # _pending_interrupts 给 handle_tool_hitl 消费，interrupts 给 API 立即返回前端。
        return {
            "_pending_interrupts": formatted_interrupts,
            "interrupts": formatted_interrupts,
            "status": "pending",
            "final_output": None,
        }

    # 第 4B 步：没有中断时，取最后一条消息作为最终回复。
    messages = extract_messages_from_result(result)
    last_message = None
    if len(messages) > 0:
        last_message = messages[-1]

    final_output = ""
    if last_message is not None:
        final_output = _message_text(last_message)

    return {
        "messages": messages,
        "final_output": final_output,
        "status": "completed",
        "interrupts": [],
        "_pending_interrupts": [],
    }


def handle_tool_hitl(state: RouterState) -> dict:
    """路由图节点：消费 registration_agent 写入的 _pending_interrupts，
    调用 interrupt() 暂停主图等待用户决策，恢复后通过 Command(resume=...) 继续 TOOL_AGENT。

    支持多轮 HITL：若 TOOL_AGENT 恢复后又产生新的中断，再次设置 _pending_interrupts
    并通过条件边循环回自身，等待下一轮用户决策。

    输入：RouterState（_pending_interrupts 非空时进入此节点）
    输出：多轮中断时 status=pending；结束时 status=completed + final_output
    """
    pending = state.get("_pending_interrupts") or [] # 获取中断内容
    if not pending: # 如果中断内容为空，则返回completed状态
        return {"status": "completed", "_pending_interrupts": []}

    config: RunnableConfig = build_hitl_config(state["session_id"]) # 构建可配置的RunnableConfig对象

    # 第 1 步：暂停主图，等待前端提交 decision。
    # 首次执行：LangGraph 在这里暂停，将 state 写入 checkpointer。
    # 恢复执行：interrupt() 返回 Command(resume=...) 携带的用户决策 dict。
    decision = interrupt({"interrupts": pending})

    # 第 2 步：把前端 decision 转成 HITL 中间件能识别的 resume 载荷，然后恢复工具 Agent。
    resume_payload = format_hitl_decision(decision)
    result = TOOL_AGENT.invoke(
        Command(resume=resume_payload),
        config=config,
        version="v2",
    )

    # 第 3 步：检查工具 Agent 是否又产生新一轮中断。
    # 例如一次对话里连续触发多个需要确认的业务操作。
    more_interrupts = extract_interrupt_dicts(result)
    if more_interrupts:
        formatted_more = format_interrupts(more_interrupts)
        return {
            "_pending_interrupts": formatted_more,
            "interrupts": formatted_more,
            "status": "pending",
            "final_output": None,
        }

    # 第 4 步：全部工具确认完成后，取最后一条消息作为最终输出。
    messages = extract_messages_from_result(result)
    last_message = None
    if len(messages) > 0:
        last_message = messages[-1]

    final_output = ""
    if last_message is not None:
        final_output = _message_text(last_message)

    return {
        "messages": messages,
        "final_output": final_output,
        "status": "completed",
        "interrupts": [],
        "_pending_interrupts": [],
    }


def check_pending_interrupts(state: RouterState) -> str:
    """条件边：根据 _pending_interrupts 决定走 HITL 暂停还是直接存储记忆。

    返回 "handle_tool_hitl" 进入中断等待；返回 "store_memory" 进入记忆存储并结束。
    """
    pending = state.get("_pending_interrupts") or []
    if len(pending) > 0:
        return "handle_tool_hitl"

    return "store_memory"


def fallback(state: RouterState) -> dict:
    """路由图节点：意图置信度过低或无法识别时，返回固定兜底话术。"""
    return {"final_output": "您好，我没有完全理解您的意思。"}


def decide_next_node(state: RouterState) -> str:
    """路由图条件边：根据 confidence 与 target_agent 选择下一个节点名。

    输入：RouterState（confidence、target_agent）
    输出：节点名字符串，如 "registration_agent"、"fallback"
    """
    # 第 1 步：读取意图识别节点给出的置信度和目标 Agent。
    confidence = state.get("confidence")
    agent = state.get("target_agent", "")

    if confidence is None or confidence < 0.5:
        return "fallback"
    if agent in ("medical_agent", "registration_agent", "chat_agent"):
        return agent
    return "fallback"


def _parse_json_from_llm(raw: str) -> dict:
    """从 LLM 返回的文本中解析 JSON（支持 markdown 代码块包裹）。

    输入：模型原始字符串
    输出：解析成功的 dict；失败时返回 {}
    """
    # 第 1 步：如果模型把 JSON 包在 markdown 代码块里，先取出代码块内部文本。
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if match:
        raw = match.group(1).strip()

    # 第 2 步：如果模型在 JSON 前后加了解释文字，只截取最外层大括号内容。
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}
