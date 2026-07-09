import logging

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command

from langchain_core.runnables import RunnableConfig

from app.agents.router.nodes import (
    analyze_intent,
    chat_agent,
    check_pending_interrupts,
    decide_next_node,
    fallback,
    handle_tool_hitl,
    medical_agent,
    registration_agent,
    retrieve_memory,
    store_memory,
)
from app.agents.router.state import RouterState

logger = logging.getLogger(__name__)

# LangGraph 的内存 checkpoint。
# 输入：RunnableConfig.configurable.thread_id，也就是本项目的 session_id。
# 作用：主图在 interrupt() 暂停时保存 RouterState，resume 时再从同一位置继续。
_checkpointer = InMemorySaver()

# StateGraph 把“检索记忆、分析意图、调用 Agent、保存记忆”等节点串成流程图。
# 每个节点接收 RouterState，并只返回自己要更新的字段。
_builder = StateGraph(RouterState)
_builder.add_node("retrieve_memory", retrieve_memory)
_builder.add_node("analyze_intent", analyze_intent)
_builder.add_node("medical_agent", medical_agent)
_builder.add_node("registration_agent", registration_agent)
_builder.add_node("handle_tool_hitl", handle_tool_hitl)  # HITL：主图暂停与恢复节点
_builder.add_node("chat_agent", chat_agent)
_builder.add_node("fallback", fallback)
_builder.add_node("store_memory", store_memory)

# 第 1 段：基础路由边。
# 用户输入先检索记忆，再做意图识别，然后根据 target_agent 进入不同 Agent 节点。
_builder.add_edge(START, "retrieve_memory")
_builder.add_edge("retrieve_memory", "analyze_intent")
_builder.add_conditional_edges(
    "analyze_intent",
    decide_next_node,
    {
        "medical_agent": "medical_agent",
        "registration_agent": "registration_agent",
        "chat_agent": "chat_agent",
        "fallback": "fallback",
    },
)
_builder.add_edge("medical_agent", "store_memory")
_builder.add_edge("chat_agent", "store_memory")
_builder.add_edge("fallback", "store_memory")
_builder.add_edge("store_memory", END)

# 第 2 段：挂号工具的 HITL 条件边。
# registration_agent 可能返回 _pending_interrupts：
# - 有待确认操作：进入 handle_tool_hitl，调用 interrupt() 暂停主图。
# - 没有待确认操作：直接进入 store_memory，保存本轮对话。
_builder.add_conditional_edges(
    "registration_agent",
    check_pending_interrupts,
    {
        "handle_tool_hitl": "handle_tool_hitl",
        "store_memory": "store_memory",
    },
)

# 第 3 段：HITL 循环边。
# 用户确认一次工具调用后，工具 Agent 可能又发起下一次确认。
# 所以 handle_tool_hitl 结束后还要再检查一次 _pending_interrupts。
_builder.add_conditional_edges(
    "handle_tool_hitl",
    check_pending_interrupts,
    {
        "handle_tool_hitl": "handle_tool_hitl",
        "store_memory": "store_memory",
    },
)

_GRAPH = _builder.compile(checkpointer=_checkpointer)


class RouterGraph:
    def __init__(self, graph=_GRAPH):
        """包装已经编译好的 LangGraph 主图，供 API 层调用。

        输入：compiled graph，默认使用本文件构建好的 _GRAPH。
        输出：RouterGraph 实例，暴露 invoke（新会话执行）和 resume（HITL 恢复）两个入口。
        """
        self.graph = graph

    def invoke(
        self,
        user_input: str,
        user_id: str | None = None,
        session_id: str | None = None,
    ) -> dict:
        """执行一轮完整路由图：记忆检索 -> 意图分析 -> Agent -> 记忆存储。

        输入：
        - user_input：前端或 Java 后端传来的用户原始问题。
        - user_id：患者或用户标识，用于检索和保存长期记忆。
        - session_id：本轮会话标识，同时作为 LangGraph 的 thread_id。

        处理：
        - 先组装 RouterState 初始状态。
        - 再把 session_id 放入 RunnableConfig.configurable.thread_id。
        - 如果 registration_agent 触发 HITL，主图会在 handle_tool_hitl 的 interrupt() 暂停。

        输出：最终 RouterState dict；可能是 status=completed，也可能是 status=pending + interrupts。
        """
        logger.info("路由图开始 | user_input=%r user_id=%s", user_input, user_id)

        thread_id = session_id or "unknown"

        initial = RouterState(
            messages=[],
            user_input=user_input,
            user_id=user_id,
            session_id=session_id,
            intent=None,
            status=None,
            interrupts=None,
            target_agent=None,
            confidence=None,
            reasoning=None,
            memory_context=None,
            final_output=None,
            _pending_interrupts=None,
        )

        # 第 1 步：把会话 ID 交给 LangGraph checkpointer。
        # 之后 resume 必须使用同一个 thread_id，才能找到这次 invoke 暂停时的状态。
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
        result = self.graph.invoke(initial, config=config)

        logger.info(
            "路由图完成 | intent=%s target_agent=%s status=%s",
            result.get("intent"),
            result.get("target_agent"),
            result.get("status"),
        )
        return result

    def resume(self, session_id: str, decision: dict) -> dict:
        """恢复被 interrupt() 暂停的主图。

        输入：
        - session_id：必须与首次 invoke 使用的 session_id 一致。
        - decision：前端用户对待确认工具的选择，例如 approve / reject / respond。

        处理：
        - 使用同一个 compiled graph 和同一个 thread_id。
        - Command(resume=decision) 会把用户选择送回 interrupt() 的返回点。
        - 主图继续执行 handle_tool_hitl 后面的条件边和 store_memory。

        输出：恢复后的 RouterState dict；多轮 HITL 时仍可能返回 status=pending。
        """
        thread_id = session_id or "unknown"
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}

        logger.info("HITL 恢复 | session_id=%s decision_type=%s",
                     thread_id, decision.get("type"))

        result = self.graph.invoke(Command(resume=decision), config=config)

        logger.info("HITL 恢复完成 | status=%s", result.get("status"))
        return result


router_graph = RouterGraph()
