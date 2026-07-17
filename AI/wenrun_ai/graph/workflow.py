"""聊天编排图（LangGraph StateGraph）的入口与节点实现。

本模块把一次用户消息的处理拆成固定顺序的节点：
检索记忆 → 路由意图 → 检索知识库 → 调用 Agent →（可选）人机确认暂停 → 写入记忆。

对外暴露 :class:`ChatWorkflow`：
- ``invoke``：新消息走完整图，返回 ``ChatExecution``（含 reply / interrupts / status）
- ``resume``：用户在前端对 pending 中断做出选择后，用 ``Command(resume=...)`` 续跑图

图状态类型为 :class:`~wenrun_ai.graph.state.ChatState`；检查点键为 ``thread_id``（由会话 ID + 用户 ID 拼成，见 ``scoped_thread_id``）。
"""

from __future__ import annotations

from collections.abc import Callable
import logging
from threading import Lock
from typing import Any

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from wenrun_ai.chains.router import Intent, route_intent
from wenrun_ai.graph.hitl import format_interrupt, normalize_decision
from wenrun_ai.graph.nodes import (
    normalize_conversation_id,
    result_interrupts,
    result_reply,
)
from wenrun_ai.graph.nodes import scoped_thread_id
from wenrun_ai.graph.state import ChatExecution, ChatInput, ChatState
from wenrun_ai.knowledge.retriever import retrieve_knowledge_context
from wenrun_ai.auth_context import wenrun_api_context


logger = logging.getLogger(__name__)


class ChatWorkflow:
    """把路由、RAG、Agent 与人机确认（HITL）串成一条 LangGraph 流水线。

    节点顺序（``_compile`` 中注册）::

        START → retrieve_memory → route_intent → retrieve_knowledge
              → invoke_agent → (pause 循环 | store_memory) → END

    依赖均可注入，便于测试替换：
    ``router`` / ``retriever`` / ``agent_runner`` / ``memory_search`` /
    ``profile_search`` / ``memory_store``；未传入时使用本类内的默认实现。
    """

    def __init__(
        self,
        *,
        router: Callable[[str], Any] = route_intent,
        retriever: Callable[[str, Any], str | None] = retrieve_knowledge_context,
        agent_runner: Callable[
            [Intent, HumanMessage, ChatState, dict[str, Any] | None], Any
        ]
        | None = None,
        memory_search: Callable[[str, str], str | None] | None = None,
        profile_search: Callable[[int, str], str | None] | None = None,
        memory_store: Callable[[str, int | None, str, str], None] | None = None,
    ):
        """组装可注入依赖并编译 StateGraph。

        输入：各步骤的可替换 callable；``agent_runner`` 签名为
        ``(intent, human_message, state, decision) -> GraphOutput | dict``。
        输出：实例持有 ``self.graph``（已带 ``InMemorySaver`` 检查点）供 ``invoke`` / ``resume`` 调用。
        """
        self.router = router
        self.retriever = retriever
        self.agent_runner = agent_runner or self._run_agent
        self.memory_search = memory_search or self._search_memory
        self.profile_search = profile_search or self._search_profile
        self.memory_store = memory_store or self._store_memory
        self.checkpointer = InMemorySaver()
        self._resume_locks: dict[str, Lock] = {}
        self._resume_locks_guard = Lock()
        self.graph = self._compile()

    def _compile(self):
        """注册节点与边，编译为可 ``invoke`` 的 LangGraph 应用。

        输入：无（使用 ``self`` 上的节点方法）。
        输出：``CompiledStateGraph``；``invoke_agent`` 与 ``pause`` 之后由
        ``_next_step`` 按 ``status`` 决定走 ``pause``（pending）还是 ``store_memory``（completed）。
        """
        builder = StateGraph(ChatState)

        # 各节点：从 ChatState 读字段，返回要 merge 进 state 的局部 dict
        builder.add_node("retrieve_memory", self._retrieve_memory)
        builder.add_node("route_intent", self._route_intent)
        builder.add_node("retrieve_knowledge", self._retrieve_knowledge)
        builder.add_node("invoke_agent", self._invoke_agent)
        builder.add_node("pause", self._pause)
        builder.add_node("store_memory", self._store_completed_memory)

        # 固定前置链：先补全上下文，再调 Agent
        builder.add_edge(START, "retrieve_memory")
        builder.add_edge("retrieve_memory", "route_intent")
        builder.add_edge("route_intent", "retrieve_knowledge")
        builder.add_edge("retrieve_knowledge", "invoke_agent")

        # Agent 若返回 HITL 中断则 status=pending，进入 pause；否则写入记忆后结束
        builder.add_conditional_edges(
            "invoke_agent", self._next_step, {"pause": "pause", "store": "store_memory"}
        )
        builder.add_conditional_edges(
            "pause", self._next_step, {"pause": "pause", "store": "store_memory"}
        )
        builder.add_edge("store_memory", END)

        return builder.compile(checkpointer=self.checkpointer)

    def invoke(self, chat: ChatInput) -> ChatExecution:
        """处理一条新用户消息，从图起点跑到暂停或结束。

        输入：``ChatInput``（message、conversation_id、user_id、api_key 等）。
        处理：规范化会话/线程 ID，构造初始 ``ChatState``，以 ``thread_id`` 为检查点键 ``invoke`` 图。
        输出：``ChatExecution``，供 HTTP 层直接序列化（reply、interrupts、status、intent）。
        """
        conversation_id = normalize_conversation_id(chat.conversation_id)
        thread_id = scoped_thread_id(conversation_id, chat.user_id)
        state: ChatState = {
            "message": chat.message,
            "conversation_id": conversation_id,
            "thread_id": thread_id,
            "api_key": chat.api_key,
            "user_id": chat.user_id,
            "patient_id": chat.patient_id,
            "user_context": chat.user_context,
            "status": "completed",
            "interrupts": [],
        }
        result = self.graph.invoke(
            state, config={"configurable": {"thread_id": thread_id}}
        )
        return self._execution(result, conversation_id)

    def resume(
        self,
        conversation_id: str | None,
        decision: dict[str, Any],
        *,
        user_id: int | None = None,
        api_key: str | None = None,
    ) -> ChatExecution:
        """在用户确认 HITL 中断后，从检查点续跑图（不重新走路由与 RAG）。

        输入：与 pending 时相同的 ``conversation_id``、前端提交的 ``decision``
        （含 ``decisions`` 列表或单条决策 dict）；可选刷新 ``api_key``。
        处理：校验检查点存在且仍有 ``next`` 节点；先校验决策合法性再 ``Command(resume=...)``，
        避免畸形输入污染已保存的检查点。
        输出：与 ``invoke`` 相同形态的 ``ChatExecution``。
        """
        if not conversation_id or not conversation_id.strip():
            raise LookupError("A pending conversation_id is required.")
        public_id = normalize_conversation_id(conversation_id)
        thread_id = scoped_thread_id(public_id, user_id)
        config = {"configurable": {"thread_id": thread_id}}
        with self._resume_lock(thread_id):
            snapshot = self.graph.get_state(config)
            if not snapshot.values or not snapshot.next:
                raise LookupError("No pending interaction exists for this conversation.")
            pending_interrupts = snapshot.values.get("interrupts", [])
            if not isinstance(pending_interrupts, list) or not pending_interrupts:
                raise LookupError("No pending interaction exists for this conversation.")
        # 在 resume 消耗检查点之前校验决策，防止非法 payload 写坏状态
            self._normalize_pending_decisions(
                pending_interrupts, decision
            )
            command = (
                Command(resume=decision, update={"api_key": api_key})
                if api_key is not None
                else Command(resume=decision)
            )
            result = self.graph.invoke(command, config=config)
        return self._execution(result, public_id)

    def _resume_lock(self, thread_id: str) -> Lock:
        with self._resume_locks_guard:
            return self._resume_locks.setdefault(thread_id, Lock())

    def _retrieve_memory(self, state: ChatState) -> ChatState:
        """按会话与用户检索历史记忆与用户画像，拼成 prompt 用的文本块。

        输入：``state["conversation_id"]``、``state["message"]``；有 ``user_id`` 时再查画像。
        输出：``memories_block`` / ``profile_block``（检索失败时为 ``None``，不阻断后续节点）。
        """
        memories = profile = None
        try:
            memories = self.memory_search(state["conversation_id"], state["message"])
        except Exception:
            logger.warning(
                "Memory retrieval failed; continuing without memory context."
            )
        if state.get("user_id") is not None:
            try:
                profile = self.profile_search(state["user_id"], state["message"])
            except Exception:
                logger.warning(
                    "Profile retrieval failed; continuing without profile context."
                )
        return {"memories_block": memories, "profile_block": profile}

    def _route_intent(self, state: ChatState) -> ChatState:
        """对用户原文做意图分类，决定后续用哪套 Agent 与知识库。

        输入：``state["message"]`` 字符串。
        输出：``intent``（:class:`~wenrun_ai.chains.router.Intent` 枚举值）。
        """
        route = self.router(state["message"])
        return {"intent": route.intent}

    def _retrieve_knowledge(self, state: ChatState) -> ChatState:
        """按意图选知识库做 RAG，并组装带上下文的 ``HumanMessage``。

        输入：``state["message"]``、``state["intent"]``，以及上一步的
        ``memories_block`` / ``profile_block`` / ``user_context``。
        输出：``knowledge_context``（无对应知识库或检索失败时为 ``None``）；
        ``human_message`` 供 ``invoke_agent`` 传入 Agent。
        """
        from wenrun_ai.chains.qa import _build_human_message, knowledge_base_for_intent

        context = None
        base = knowledge_base_for_intent(state["intent"])
        if base is not None:
            try:
                context = self.retriever(state["message"], base)
            except Exception:
                logger.warning(
                    "RAG retrieval failed; continuing without knowledge context."
                )
                context = None
        return {
            "knowledge_context": context,
            "human_message": _build_human_message(
                state["message"],
                state.get("user_context"),
                state.get("memories_block"),
                state.get("profile_block"),
                context,
            ),
        }

    def _invoke_agent(self, state: ChatState) -> ChatState:
        """首次调用 Agent（无用户决策），把运行结果转成图状态字段。

        输入：已含 ``intent`` 与 ``human_message`` 的 ``ChatState``。
        输出：经 ``_outcome`` 得到的 ``status`` / ``reply`` / ``interrupts``。
        """
        outcome = self._call_agent(state, None)
        return self._outcome(outcome)

    def _pause(self, state: ChatState) -> ChatState:
        """LangGraph ``interrupt`` 暂停点：把待确认操作交给前端，收到决策后再调 Agent。

        输入：``state["interrupts"]`` 为待展示的中断列表（已由 ``_outcome`` 格式化）。
        处理：``interrupt(...)`` 挂起图执行；用户 ``resume`` 时 payload 经
        ``_normalize_pending_decisions`` 校验后作为 ``decision`` 再次 ``_call_agent``。
        输出：同 ``_invoke_agent``，可能再次 pending 或 completed。
        """
        payload = interrupt({"interrupts": state["interrupts"]})
        normalized = self._normalize_pending_decisions(state["interrupts"], payload)
        outcome = self._call_agent(state, normalized)
        return self._outcome(outcome)

    def _call_agent(self, state: ChatState, decision: dict[str, Any] | None):
        """在 WenRun API 鉴权上下文中调用可注入的 ``agent_runner``。

        输入：完整 ``ChatState``；``decision`` 为 ``None``（首轮）或 resume 后的
        ``{"decisions": [...]}`` 形态。
        输出：Agent ``invoke`` 的原始返回值（dict 或带 messages/interrupts 的结构）。
        """
        with wenrun_api_context(state.get("api_key"), state.get("user_id")):
            return self.agent_runner(
                state["intent"], state["human_message"], state, decision
            )

    @staticmethod
    def _normalize_pending_decisions(
        interrupts: list[dict[str, Any]], payload: dict[str, Any]
    ) -> dict[str, Any]:
        """把前端 resume 载荷对齐到每条 pending 中断，并转成 Agent 可消费的 decisions。

        输入：``interrupts`` 为图中保存的待确认项（含 ``tool``、``allowedDecisions``）；
        ``payload`` 为用户提交的单条 dict 或带 ``decisions`` 列表的 dict。
        输出：``{"decisions": [...]}``，供 ``Command(resume=...)`` 传入子 Agent。
        校验失败时抛 ``ValueError``（条数不匹配或决策不在允许列表内）。
        """
        supplied = payload.get("decisions") if isinstance(payload, dict) else None
        if supplied is None:
            supplied = [payload]
        if not isinstance(supplied, list) or len(supplied) != len(interrupts):
            raise ValueError("One decision is required for each pending action.")
        decisions = []
        for action, decision in zip(interrupts, supplied, strict=True):
            allowed = action.get("allowedDecisions")
            requested = decision.get("decision") if isinstance(decision, dict) else None
            if isinstance(allowed, list) and requested not in allowed:
                raise ValueError(
                    "Requested decision is not allowed for this pending action."
                )
            decisions.extend(normalize_decision(action["tool"], decision)["decisions"])
        return {"decisions": decisions}

    def _outcome(self, outcome: Any) -> ChatState:
        """把 Agent 返回值统一为图的 ``status`` / ``reply`` / ``interrupts`` 字段。

        输入：``agent_runner`` 的 invoke 结果（dict，可能含 interrupts 或 messages）。
        处理：用 ``result_interrupts`` 提取中断；无中断则 ``result_reply`` 取文本回复。
        有待确认写操作时格式化为前端可读的 interrupt payload（title/summary/details）。
        输出：``status`` 为 ``pending``（有中断、无 reply）或 ``completed``。
        """
        pending = result_interrupts(outcome)
        if pending:
            formatted = []
            for item in pending:
                payload = format_interrupt(item["tool"], item.get("args", {}))
                for field in ("title", "summary", "details"):
                    if field in item:
                        payload[field] = item[field]
                allowed = item.get("allowedDecisions")
                if isinstance(allowed, list) and all(
                    isinstance(choice, str) for choice in allowed
                ):
                    payload["allowedDecisions"] = allowed
                formatted.append(payload)
            return {"status": "pending", "interrupts": formatted, "reply": None}
        return {"status": "completed", "interrupts": [], "reply": result_reply(outcome)}

    @staticmethod
    def _next_step(state: ChatState) -> str:
        """条件边路由：根据 Agent 结果决定进入暂停环还是写入记忆。

        输入：合并了 ``_outcome`` 返回值后的 ``ChatState``。
        输出：``"pause"``（status 为 pending）或 ``"store"``（已完成、可落库）。
        """
        return "pause" if state.get("status") == "pending" else "store"

    def _store_completed_memory(self, state: ChatState) -> ChatState:
        """对话正常结束时，把本轮 user 消息与 assistant 回复写入长期记忆。

        输入：``state["message"]``、``state.get("reply")``、``conversation_id``、``user_id``。
        输出：空 dict（不向 state 追加字段）；写入失败只打日志，不丢 reply。
        """
        reply = state.get("reply")
        if reply:
            try:
                self.memory_store(
                    state["conversation_id"],
                    state.get("user_id"),
                    state["message"],
                    reply,
                )
            except Exception:
                logger.warning("Memory store failed; completed reply is preserved.")
        return {}

    @staticmethod
    def _search_memory(conversation_id: str, message: str) -> str | None:
        """默认实现：按会话检索加权记忆并格式化为 prompt 段落。

        输入：会话 ID、当前用户消息（作检索 query）。
        输出：可拼进 ``human_message`` 的字符串，无命中时为 ``None``。
        """
        from wenrun_ai.memory import (
            format_memories_for_prompt,
            search_memories_weighted,
        )

        return format_memories_for_prompt(
            search_memories_weighted(conversation_id, message)
        )

    @staticmethod
    def _search_profile(user_id: int, message: str) -> str | None:
        """默认实现：按用户 ID 检索画像片段并格式化为 prompt 段落。

        输入：登录用户 ID、当前消息（作检索 query）。
        输出：画像文本块或 ``None``。
        """
        from wenrun_ai.memory import format_profile_for_prompt, search_profile

        return format_profile_for_prompt(search_profile(user_id, message, top_k=5))

    @staticmethod
    def _store_memory(
        conversation_id: str, user_id: int | None, message: str, reply: str
    ) -> None:
        """默认实现：去重后写入一轮问答到记忆库。

        输入：会话 ID、可选用户 ID、用户原文、助手回复。
        输出：无（副作用为持久化存储）。
        """
        from wenrun_ai.memory import add_memory_pair_with_dedup

        add_memory_pair_with_dedup(conversation_id, user_id, message, reply)

    @staticmethod
    def _run_agent(
        intent: Intent,
        human_message: HumanMessage,
        state: ChatState,
        decision: dict[str, Any] | None = None,
    ):
        """默认 ``agent_runner``：按意图取子图 Agent 并 invoke。

        输入：路由得到的 ``intent``、组装好的 ``human_message``、含 ``thread_id`` 的 state；
        ``decision`` 非空时用 ``Command(resume=decision)`` 续跑 HITL 子图。
        输出：该意图对应 Agent 的 invoke 结果（交给 ``_outcome`` 解析）。
        """
        from wenrun_ai.chains.qa import get_agent

        agent = get_agent(intent)
        config = {"configurable": {"thread_id": state["thread_id"]}}
        if decision is not None:
            return agent.invoke(Command(resume=decision), config=config)
        return agent.invoke({"messages": [human_message]}, config=config)

    @staticmethod
    def _execution(result: ChatState, conversation_id: str) -> ChatExecution:
        """把图终态 ``ChatState`` 收成对外稳定的 ``ChatExecution``  dataclass。

        输入：``graph.invoke`` 的最终 state、对外展示的 ``conversation_id``（非内部 thread_id）。
        输出：API 层使用的不可变响应体。
        """
        return ChatExecution(
            status=result.get("status", "completed"),
            conversation_id=conversation_id,
            reply=result.get("reply"),
            intent=result.get("intent"),
            interrupts=result.get("interrupts", []),
        )
