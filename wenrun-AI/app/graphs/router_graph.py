"""
LangGraph 路由图 — 意图判断 + 分发到子 Agent + 记忆检索/存储

处理流程（含记忆）：
1. retrieve_memory    → 从 Qdrant 向量库检索用户历史记忆 + 近期对话
2. analyze_intent     → LLM 分析用户意图（结合记忆上下文）
3. medical_agent      → 医疗知识问答（注入记忆上下文）
   registration_agent → 挂号相关操作（注入记忆上下文）
   chat_agent         → 谈心闲聊（注入记忆上下文）
4. store_memory       → 将本轮对话存入 Qdrant 向量库供后续检索

调用方式：
    from app.graphs.router_graph import router_graph
    result = router_graph.invoke("用户消息", user_id="1001", session_id="sess_001")
    # → {"intent": "medical", "target_agent": "medical_agent", "final_output": "..."}
"""

import json
import logging
import os
import re
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END, START
from typing import TypedDict, Optional

from app.memory import MemoryStore
from app.memory.memory_store import format_memory_context
from app.tools.patient import PATIENT_ALL_TOOLS
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware

load_dotenv()

# 路由图专用日志器，输出 AI 意图分析与分发决策
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State — 图执行过程中流转的状态
# ---------------------------------------------------------------------------

class RouterState(TypedDict):
    """图执行过程中流转的状态。

    新增字段（记忆功能）：
    - user_id:       用户唯一标识，用于记忆的隔离存储与检索
    - session_id:    会话唯一标识，用于回溯同一会话的对话历史
    - memory_context: 从向量库检索到的相关记忆文本，会注入到子 Agent 的提示词中
    """
    messages: list[BaseMessage]      # 对话消息序列
    user_input: str                  # 本次用户输入
    user_id: Optional[str]           # 用户 ID（记忆隔离键）
    session_id: Optional[str]        # 会话 ID（用于回溯）
    intent: Optional[str]            # 意图识别结果（medical / registration / chat）
    target_agent: Optional[str]      # 目标 Agent 名称
    confidence: Optional[float]      # 置信度 0.0-1.0
    reasoning: Optional[str]         # 选择理由
    memory_context: Optional[str]    # 检索到的相关记忆文本（注入 LLM 提示词）
    final_output: Optional[str]      # 最终回复文本

# ---------------------------------------------------------------------------
# 系统提示词
# ---------------------------------------------------------------------------

# 意图分析提示词 — 保留 {memory_context} 占位符，实际调用时由 _build_intent_prompt() 填充
_INTENT_SYSTEM_PROMPT_TEMPLATE = (
    "你是一个智能客服路由助手，负责分析用户意图并将消息分发给最合适的 Agent。\n\n"
    "## 意图分类（三选一）\n"
    "1. **medical** — 用户询问医疗知识、疾病症状、药物信息、健康建议等医学相关话题\n"
    "2. **registration** — 用户希望挂号、预约医生、查询科室、取消或改约等就诊相关操作\n"
    "3. **chat** — 用户只是想闲聊、谈心、问候、表达情绪等非医疗非挂号类话题\n\n"
    "## 输出要求\n"
    "请只输出一个 JSON 对象（不要包含其他任何内容）：\n"
    "{{\n"
    '    "intention": "medical | registration | chat",\n'
    '    "target_agent": "medical_agent | registration_agent | chat_agent",\n'
    '    "confidence": 0.0-1.0,\n'
    '    "reasoning": "选择该分类的简短理由"\n'
    "}}"
)

# ---------------------------------------------------------------------------
# 节点函数
# ---------------------------------------------------------------------------

def _build_medical_system_prompt(memory_context: Optional[str]) -> str:
    """构建医疗助手的系统提示词，包含记忆上下文。"""
    base = (
        "你是一个专业的医疗知识助手，请用准确、严谨但通俗易懂的语言回答用户的医学问题。\n"
        "注意：你的建议不能替代专业医生的诊断，请提醒用户必要时前往医院就诊。"
    )
    if memory_context:
        base += f"\n\n## 用户历史信息\n{memory_context}\n\n请结合以上历史信息回答用户问题，"
        base += "特别注意用户的过敏史、既往病史、用药情况等信息。"
    return base


def _build_registration_system_prompt(memory_context: Optional[str]) -> str:
    """构建挂号助手的系统提示词，包含记忆上下文。"""
    base = (
        "你是一个医院助手，你所回答的内容均要与医院有关，"
        "比如：线上挂号、线上预约以及医院的师资力量答复。"
    )
    if memory_context:
        base += f"\n\n## 用户历史信息\n{memory_context}\n\n请结合以上历史信息，"
        base += "了解用户的偏好科室、常用医生、过往挂号记录等，提供更贴心的服务。"
    return base


def _build_chat_system_prompt(memory_context: Optional[str]) -> str:
    """构建谈心助手的系统提示词，包含记忆上下文。"""
    base = "你是一个友善的在线医院客服助手，请用温暖亲切的语气回复用户。"
    if memory_context:
        base += f"\n\n## 用户历史信息\n{memory_context}\n\n请结合以上信息，"
        base += "了解用户的过往交流内容，让对话更自然、更有连续性。"
    return base


def _build_intent_prompt(memory_context: Optional[str]) -> str:
    """构建意图分析的提示词，可选地注入记忆上下文辅助分类。"""
    prompt = _INTENT_SYSTEM_PROMPT_TEMPLATE
    if memory_context:
        prompt = (
            f"## 用户历史信息\n{memory_context}\n\n"
            f"请结合以上历史信息更准确地判断用户意图。\n\n"
            f"{prompt}"
        )
    return prompt


# ---------------------------------------------------------------------------
# 记忆相关节点
# ---------------------------------------------------------------------------

def retrieve_memory(state: RouterState) -> dict:
    """
    节点 0：在意图分析之前，从向量库检索相关历史记忆。

    检索内容包括：
    - 近期对话：当前 session 的最近 N 轮对话（提供对话连贯性）
    - 相关记忆：跨会话的语义相关记忆（提供长期记忆，如过敏史、偏好等）

    若 Qdrant 不可用或用户未登录，降级为空上下文，不影响主流程。
    """
    user_id = state.get("user_id")
    session_id = state.get("session_id")
    user_input = state["user_input"]

    # 无用户标识时跳过记忆检索（如匿名访客）
    if not user_id:
        logger.debug("【记忆检索】跳过 — 无 user_id")
        return {"memory_context": None}

    logger.info(
        "【记忆检索】开始 | user_id=%s session_id=%s input_len=%d",
        user_id,
        session_id,
        len(user_input),
    )

    try:
        store = MemoryStore()

        # 获取当前会话的近期对话历史
        session_history = store.get_session_history(
            session_id=session_id or "",
            user_id=user_id,
            limit=20,
        )

        # 语义检索跨会话的相关记忆
        relevant_memories = store.retrieve_relevant(
            user_id=user_id,
            query=user_input,
            top_k=5,
        )

        # 格式化为 LLM 可读的上下文文本
        context = format_memory_context(
            session_history=session_history,
            relevant_memories=relevant_memories,
        )

        logger.info(
            "【记忆检索】完成 | session_history=%d relevant=%d has_context=%s",
            len(session_history),
            len(relevant_memories),
            bool(context),
        )
        return {"memory_context": context}

    except Exception as exc:
        logger.warning(
            "【记忆检索】异常，降级为无记忆模式 | user_id=%s error=%s",
            user_id,
            exc,
        )
        return {"memory_context": None}


def store_memory(state: RouterState) -> dict:
    """
    节点 N：对话完成后，将本轮对话存入向量库供后续检索。

    存储内容：
    - 用户消息：content = user_input, message_type = "user"
    - AI 回复：content = final_output, message_type = "assistant"

    若 Qdrant 不可用或用户未登录，静默跳过，不影响主流程。
    """
    user_id = state.get("user_id")
    session_id = state.get("session_id")
    user_input = state["user_input"]
    final_output = state.get("final_output", "")
    intent = state.get("intent") or "chat"

    # 无用户标识时跳过存储
    if not user_id:
        logger.debug("【记忆存储】跳过 — 无 user_id")
        return {}

    logger.info(
        "【记忆存储】开始 | user_id=%s session_id=%s intent=%s",
        user_id,
        session_id,
        intent,
    )

    try:
        store = MemoryStore()
        effective_session = session_id or "unknown"

        # 存储用户消息
        store.store_memory(
            user_id=user_id,
            session_id=effective_session,
            content=user_input,
            message_type="user",
            intent=intent,
            memory_type="conversation",
        )

        # 存储 AI 回复
        if final_output:
            store.store_memory(
                user_id=user_id,
                session_id=effective_session,
                content=final_output,
                message_type="assistant",
                intent=intent,
                memory_type="conversation",
            )

        logger.info("【记忆存储】完成 | user_id=%s session_id=%s", user_id, session_id)
        return {}

    except Exception as exc:
        logger.warning(
            "【记忆存储】异常 | user_id=%s session_id=%s error=%s",
            user_id,
            session_id,
            exc,
        )
        return {}


# ---------------------------------------------------------------------------
# 意图分析与分派节点
# ---------------------------------------------------------------------------

def analyze_intent(state: RouterState) -> dict:
    """
    节点 1：调用 LLM 分析用户意图，输出结构化决策。

    注：如果有 memory_context，会注入到提示词中以辅助意图分类。
    """
    user_input = state["user_input"]
    memory_context = state.get("memory_context")
    logger.info("【意图分析】开始 | user_input=%r has_memory=%s", user_input, bool(memory_context))

    system_prompt = _build_intent_prompt(memory_context)
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_input),
    ]

    response = MODEL.invoke(messages)

    # 解析 LLM 返回的 JSON
    content = getattr(response, "content", "") or ""
    raw = content.strip() if isinstance(content, str) else str(content).strip()
    parsed = _parse_json_from_llm(raw)

    # 解析失败时记录警告，便于排查模型输出格式问题
    if not parsed:
        logger.warning("【意图分析】JSON 解析失败，将使用默认值 chat | raw=%r", raw)
    else:
        logger.debug("【意图分析】LLM 原始响应 | raw=%s", raw)

    intent = parsed.get("intention", "chat")
    target_agent = parsed.get("target_agent", "chat_agent")
    confidence = float(parsed.get("confidence", 0))
    reasoning = parsed.get("reasoning", "")

    # 结构化输出 AI 的分析结论（reasoning 即模型给出的分类理由）
    logger.info(
        "【意图分析】完成 | intent=%s target_agent=%s confidence=%.2f reasoning=%s",
        intent,
        target_agent,
        confidence,
        reasoning,
    )

    return {
        "messages": [response],
        "intent": intent,
        "target_agent": target_agent,
        "confidence": confidence,
        "reasoning": reasoning,
        "final_output": None,  # 后续节点填充
    }


def medical_agent(state: RouterState) -> dict:
    """
    节点 2a：医疗知识问答。

    注入 memory_context 以利用用户历史健康信息（过敏史、既往病史等）。
    TODO: 接入医疗知识库 RAG / 专业医学模型。
    """
    logger.info("【子 Agent】进入 medical_agent | user_input=%r", state["user_input"])
    memory_context = state.get("memory_context")
    system_prompt = _build_medical_system_prompt(memory_context)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["user_input"]),
    ]
    response = MODEL.invoke(messages)
    content = getattr(response, "content", "") or ""
    return {
        "messages": [response],
        "final_output": content.strip() if isinstance(content, str) else str(content).strip(),
    }


def registration_agent(state: RouterState) -> dict:
    """
    节点 2b：挂号预约处理等医院相关的内容。

    通过 LangChain Agent 调用患者业务工具，注入 memory_context 了解用户偏好。
    使用 HumanInTheLoopMiddleware 在关键操作前请求用户确认。
    """
    logger.info("【子 Agent】进入 registration_agent | user_input=%r", state["user_input"])
    memory_context = state.get("memory_context")
    system_prompt = _build_registration_system_prompt(memory_context)

    agent = create_agent(
        model=MODEL,
        tools=PATIENT_ALL_TOOLS,
        middleware=[
            HumanInTheLoopMiddleware(
                interrupt_on={
                    "list_registrations": {
                        "allowed_decisions": ["approve", "reject", "edit"],
                        "description": "罗列出将要挂号的信息，让用户确认是否继续执行挂号操作",
                    }
                }
            )
        ],
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["user_input"]),
    ]

    # create_agent 返回的是 CompiledStateGraph，invoke 需要状态字典而非 list
    result = agent.invoke({"messages": messages})

    # 提取最后一条 AI 消息的内容作为最终输出
    result_messages = result.get("messages", [])
    final_msg = result_messages[-1] if result_messages else None
    final_output = getattr(final_msg, "content", "") if final_msg else ""
    output_text = final_output.strip() if isinstance(final_output, str) else str(final_output).strip()
    logger.info(
        "【子 Agent】registration_agent 完成 | message_count=%d output_len=%d",
        len(result_messages),
        len(output_text),
    )

    return {
        "messages": result_messages,
        "final_output": output_text,
    }


def chat_agent(state: RouterState) -> dict:
    """
    节点 2c：闲聊谈心。

    注入 memory_context 以了解用户之前的交流内容，让对话更自然连贯。
    TODO: 接入通用对话模型。
    """
    logger.info("【子 Agent】进入 chat_agent | user_input=%r", state["user_input"])
    memory_context = state.get("memory_context")
    system_prompt = _build_chat_system_prompt(memory_context)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["user_input"]),
    ]
    response = MODEL.invoke(messages)
    content = getattr(response, "content", "") or ""
    return {
        "messages": [response],
        "final_output": content.strip() if isinstance(content, str) else str(content).strip(),
    }


def fallback(state: RouterState) -> dict:
    """兜底节点：低置信度时引导用户明确意图。"""
    logger.info(
        "【兜底】进入 fallback | confidence=%s target_agent=%s reasoning=%s",
        state.get("confidence"),
        state.get("target_agent"),
        state.get("reasoning"),
    )
    return {
        "final_output": "您好，我没有完全理解您的意思。",
    }


# ---------------------------------------------------------------------------
# 条件路由函数
# ---------------------------------------------------------------------------

def decide_next_node(state: RouterState) -> str:
    """
    条件边：根据 target_agent 决定分发到哪个子节点。
    低置信度时走 fallback。
    """
    confidence = state.get("confidence")
    agent = state.get("target_agent", "")

    # 置信度不足时强制走兜底，避免误分发
    if confidence is None or confidence < 0.5:
        next_node = "fallback"
        logger.info(
            "【路由决策】低置信度 → %s | confidence=%s target_agent=%s",
            next_node,
            confidence,
            agent,
        )
        return next_node

    if agent in ("medical_agent", "registration_agent", "chat_agent"):
        logger.info(
            "【路由决策】分发 → %s | intent=%s confidence=%.2f",
            agent,
            state.get("intent"),
            confidence,
        )
        return agent

    # target_agent 不在白名单内，走兜底
    logger.warning(
        "【路由决策】未知 target_agent=%r → fallback | intent=%s",
        agent,
        state.get("intent"),
    )
    return "fallback"


# ---------------------------------------------------------------------------
# JSON 解析工具
# ---------------------------------------------------------------------------

def _parse_json_from_llm(raw: str) -> dict:
    """从 LLM 的回复中提取并解析 JSON，适配模型可能输出 markdown 包裹或多余文字。"""
    # 尝试匹配 ```json ... ``` 包裹
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if match:
        raw = match.group(1).strip()

    # 尝试匹配顶层 { ... }
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


# ---------------------------------------------------------------------------
# 编译图
# ---------------------------------------------------------------------------

MODEL = init_chat_model(
    model=os.getenv("MODEL_NAME", "glm-5.1"),
    model_provider=os.getenv("MODEL_PROVIDER", "openai"),
    temperature=float(os.getenv("MODEL_TEMPERATURE", "0.3")),
)

# 构建 LangGraph 状态图
builder = StateGraph(RouterState)

# ---- 注册节点 ----
builder.add_node("retrieve_memory", retrieve_memory)
builder.add_node("analyze_intent", analyze_intent)
builder.add_node("medical_agent", medical_agent)
builder.add_node("registration_agent", registration_agent)
builder.add_node("chat_agent", chat_agent)
builder.add_node("fallback", fallback)
builder.add_node("store_memory", store_memory)

# ---- 定义边 ----
# 新流程：START → retrieve_memory → analyze_intent → agent → store_memory → END
builder.add_edge(START, "retrieve_memory")
builder.add_edge("retrieve_memory", "analyze_intent")

# 意图分析后根据条件分发给子 Agent 或 fallback
builder.add_conditional_edges(
    "analyze_intent",
    decide_next_node,
    {
        "medical_agent": "medical_agent",
        "registration_agent": "registration_agent",
        "chat_agent": "chat_agent",
        "fallback": "fallback",
    },
)

# 子 Agent 完成后统一走到 store_memory 存储本轮对话
builder.add_edge("medical_agent", "store_memory")
builder.add_edge("registration_agent", "store_memory")
builder.add_edge("chat_agent", "store_memory")
builder.add_edge("fallback", "store_memory")

# 记忆存储后结束
builder.add_edge("store_memory", END)

GRAPH = builder.compile()

# ---------------------------------------------------------------------------
# 对外接口 — 供其他 Agent 调用
# ---------------------------------------------------------------------------

class RouterGraph:
    """编译后的 LangGraph，暴露简单的 invoke 入口给外部调用。

    使用示例：
        from app.graphs.router_graph import router_graph
        result = router_graph.invoke(
            "我想挂心内科的号",
            user_id="1001",
            session_id="sess_abc123",
        )
    """

    def __init__(self, graph=GRAPH):
        self.graph = graph

    def invoke(
        self,
        user_input: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> dict:
        """
        运行路由图，返回最终状态（含 intent / target_agent / final_output 等）。

        参数：
            user_input:  用户输入的文本消息
            user_id:     用户唯一标识（用于记忆检索与存储，匿名用户可为 None）
            session_id:  会话唯一标识（用于回溯对话历史，可为 None）

        返回：
            字典包含 intent, target_agent, confidence, reasoning, final_output 等字段
        """
        logger.info(
            "【路由图】开始执行 | user_input=%r user_id=%s session_id=%s",
            user_input,
            user_id,
            session_id,
        )

        initial = RouterState(
            messages=[],
            user_input=user_input,
            user_id=user_id,
            session_id=session_id,
            intent=None,
            target_agent=None,
            confidence=None,
            reasoning=None,
            memory_context=None,
            final_output=None,
        )

        result: dict = {}

        # 单次 stream，每完成一个节点合并后输出当前状态快照（避免重复调用 LLM）
        for step_idx, result in enumerate(
            self.graph.stream(initial, stream_mode="values"), start=1
        ):
            logger.info(
                "【路由图】状态更新 #%d | intent=%s target_agent=%s confidence=%s "
                "reasoning=%s has_memory_context=%s has_final_output=%s",
                step_idx,
                result.get("intent"),
                result.get("target_agent"),
                result.get("confidence"),
                result.get("reasoning"),
                bool(result.get("memory_context")),
                bool(result.get("final_output")),
            )

        logger.info(
            "【路由图】执行完成 | intent=%s target_agent=%s confidence=%s "
            "has_output=%s",
            result.get("intent"),
            result.get("target_agent"),
            result.get("confidence"),
            bool(result.get("final_output")),
        )
        return result


router_graph = RouterGraph()
