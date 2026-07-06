
import json
import logging
import re

from app.tools import PATIENT_ALL_TOOLS
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm import MODEL
from app.agents.router.prompts import (
    build_chat_system_prompt,
    build_intent_prompt,
    build_medical_system_prompt,
)
from app.agents.router.state import RouterState
from app.memory import MemoryStore, format_memory_context
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt

logger = logging.getLogger(__name__)

# 创建工具Agent实例, 主要用于人工干预
TOOL_AGENT = create_agent(
    model=MODEL,
    tools=PATIENT_ALL_TOOLS,
    middleware=[
        HumanInTheLoopMiddleware(
            interrupt_on={
                "create_registration": {
                    "allowed_decisions": ["approve", "reject", "respond"],
                    "description": "创建挂号预约",
                },
            }
        )
    ],
    checkpointer=InMemorySaver(),
)


# 获取消息文本工具函数。
def _message_text(message) -> str:
    content = getattr(message, "content", "") or ""  # 获取消息内容
    if isinstance(content, str):
        return content.strip()  # 如果内容是字符串，则返回内容
    return str(content).strip()  # 如果内容不是字符串，则返回内容


# 检索记忆节点(调用的函数基本均在wenrun-AI\app\memory\store.py中)。
def retrieve_memory(state: RouterState) -> dict:
    user_id = state.get("user_id")
    if not user_id:
        return {
            "memory_context": None
        }  # 如果用户ID为空，则返回空字典说明没有记忆上下文

    try:
        store = MemoryStore()  # 创建记忆存储实例

        session_history = store.get_session_history(  # 获取会话历史记录
            session_id=state.get("session_id") or "",  # 获取会话ID
            user_id=user_id,  # 获取用户ID
            limit=20,  # 获取会话历史记录数量
        )
        relevant = store.retrieve_relevant(  # 获取相关记忆
            user_id=user_id, query=state["user_input"], top_k=5
        )
        context = format_memory_context(  # 格式化记忆上下文
            session_history=session_history, relevant_memories=relevant
        )
        return {"memory_context": context}  # 返回记忆上下文
    except Exception as exc:
        logger.warning("记忆检索失败，跳过 | user_id=%s error=%s", user_id, exc)
        return {
            "memory_context": None
        }  # 如果记忆检索失败，则返回空字典说明没有记忆上下文


# 存储记忆节点(调用的函数基本均在wenrun-AI\app\memory\store.py中)。
def store_memory(state: RouterState) -> dict:
    user_id = state.get("user_id")
    if not user_id:
        return {}

    try:
        store = MemoryStore()  # 创建记忆存储实例
        session_id = state.get("session_id") or "unknown"  # 获取会话ID
        intent = state.get("intent") or "chat"  # 获取意图

        store.store_memory(  # 存储记忆
            user_id=user_id,
            session_id=session_id,
            content=state["user_input"],
            message_type="user",
            intent=intent,
        )
        final_output = state.get("final_output") or ""  # 获取最终输出
        if final_output:
            store.store_memory(  # 存储记忆
                user_id=user_id,
                session_id=session_id,
                content=final_output,
                message_type="assistant",
                intent=intent,
            )
    except Exception as exc:
        logger.warning("记忆存储失败 | user_id=%s error=%s", user_id, exc)
    return {}  # 如果记忆存储失败，则返回空字典说明没有记忆上下文


# 分析意图节点。
def analyze_intent(state: RouterState) -> dict:
    memory_context = state.get("memory_context")  # 获取记忆上下文
    messages = [
        SystemMessage(content=build_intent_prompt(memory_context)),
        HumanMessage(content=state["user_input"]),
    ]
    response = MODEL.invoke(messages)
    parsed = _parse_json_from_llm(_message_text(response))  # 解析LLM响应中的JSON数据

    return {
        "messages": [response],
        "intent": parsed.get("intention", "chat"),
        "target_agent": parsed.get("target_agent", "chat_agent"),
        "confidence": float(parsed.get("confidence", 0)),
        "reasoning": parsed.get("reasoning", ""),
        "final_output": None,
    }


# 运行聊天工具。
def _run_chat(system_prompt: str, user_input: str) -> dict:
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_input)]
    response = MODEL.invoke(messages)
    return {"messages": [response], "final_output": _message_text(response)}


# 医疗Agent节点。
def medical_agent(state: RouterState) -> dict:
    prompt = build_medical_system_prompt(state.get("memory_context"))
    return _run_chat(prompt, state["user_input"])


# 聊天Agent节点。
def chat_agent(state: RouterState) -> dict:
    prompt = build_chat_system_prompt(state.get("memory_context"))
    return _run_chat(prompt, state["user_input"])

#TODO 工具函数：将hitl产出的格式数据转变为前端可读的题目格式
def _format_interrupts(interrupts: list) -> list:
    """定义函数工具用于将中断json数据转变为前端可读的题目格式"""

#TODO 工具函数：将前端传过来的数据转变为hitl所需的数据格式
def _format_hitl_data(data: dict) -> dict:
    """定义函数工具用于将前端传过来的数据转变为hitl所需的数据格式"""

# 工具Agent节点。
def registration_agent(state: RouterState) -> dict:
    config: RunnableConfig = {
        "configurable": {
            "thread_id": state.get("session_id") or "unknown",
        }
    }
    result = TOOL_AGENT.invoke(
        {"messages": [HumanMessage(content=state.get("user_input", ""))]},
        config=config,
    )
    #获取工具Agent的原始中断
    raw_interrupts = getattr(result, "interrupts", None)

    if raw_interrupts is None:
        raw_interrupts = [] #如果原始中断为空，则返回空列表

    interrupts = [] #初始化中断列表
    for item in raw_interrupts: #遍历原始中断    （其中item为中断的值）
        if hasattr(item, "value"):
            value = item.value #如果中断有值，则获取值
        else:
            value = item #如果中断没有值，则获取中断本身

        if isinstance(value, dict): #如果值是字典，则添加到中断列表
            interrupts.append(value) #添加到中断列表
    
    

    
    

# 回退节点。
def fallback(state: RouterState) -> dict:
    return {"final_output": "您好，我没有完全理解您的意思。"}


# 决定下一个节点函数。
def decide_next_node(state: RouterState) -> str:
    confidence = state.get("confidence")  # 获取置信度
    agent = state.get("target_agent", "")  # 获取目标Agent

    if confidence is None or confidence < 0.5:
        return "fallback"  # 如果置信度小于0.5，则返回fallback节点
    if agent in ("medical_agent", "registration_agent", "chat_agent"):
        return agent  # 如果目标Agent是medical_agent、registration_agent或chat_agent，则返回目标Agent节点
    return "fallback"  # 如果目标Agent不是medical_agent、registration_agent或chat_agent，则返回fallback节点


# 解析 LLM 响应中的 JSON 数据工具函数。
def _parse_json_from_llm(raw: str) -> dict:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)  # 搜索JSON数据
    if match:
        raw = match.group(1).strip()  # 获取JSON数据

    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0).strip()  # 获取JSON数据

    try:
        return json.loads(raw)  # 解析JSON数据
    except json.JSONDecodeError:
        return {}  # 如果解析失败，则返回空字典
