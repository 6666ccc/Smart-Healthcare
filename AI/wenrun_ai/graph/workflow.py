"""LangGraph orchestration for routing, RAG and agent execution."""

from __future__ import annotations

from collections.abc import Callable
import logging
from threading import Lock
from typing import Any

from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, StateGraph

from wenrun_ai.chains.router import Intent, route_intent
from wenrun_ai.graph.nodes import normalize_conversation_id, result_reply, scoped_thread_id
from wenrun_ai.graph.state import ChatExecution, ChatInput, ChatState
from wenrun_ai.knowledge.retriever import retrieve_knowledge_context
from wenrun_ai.auth_context import wenrun_api_context


logger = logging.getLogger(__name__)


class ChatWorkflow:
    """A StateGraph with injectable integrations for reliable testing."""

    def __init__(
        self,
        *,
        router: Callable[[str], Any] = route_intent,
        retriever: Callable[[str, Any], str | None] = retrieve_knowledge_context,
        agent_runner: Callable[[Intent, HumanMessage, ChatState], Any] | None = None,
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
        builder.add_node("store_memory", self._store_completed_memory)

        # 固定前置链：先补全上下文，再调 Agent
        builder.add_edge(START, "retrieve_memory")
        builder.add_edge("retrieve_memory", "route_intent")
        builder.add_edge("route_intent", "retrieve_knowledge")
        builder.add_edge("retrieve_knowledge", "invoke_agent")
        builder.add_edge("invoke_agent", "store_memory")
        builder.add_edge("store_memory", END)
        return builder.compile()

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
        }
        result = self.graph.invoke(state)
        return self._execution(result, conversation_id)

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
        with wenrun_api_context(state.get("api_key"), state.get("user_id")):
            outcome = self.agent_runner(state["intent"], state["human_message"], state)
        return {"status": "completed", "reply": result_reply(outcome)}

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
    def _run_agent(intent: Intent, human_message: HumanMessage, state: ChatState):
        from wenrun_ai.chains.qa import get_agent

        agent = get_agent(intent)
        config = {"configurable": {"thread_id": state["thread_id"]}}
        return agent.invoke({"messages": [human_message]}, config=config)

    @staticmethod
    def _execution(result: ChatState, conversation_id: str) -> ChatExecution:
        return ChatExecution(
            status="completed",
            conversation_id=conversation_id,
            reply=result.get("reply"),
            intent=result.get("intent"),
        )
