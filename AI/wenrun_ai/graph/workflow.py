"""LangGraph orchestration for routing, RAG and agent execution."""

from __future__ import annotations

from collections.abc import Callable
import logging
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
        self.router = router
        self.retriever = retriever
        self.agent_runner = agent_runner or self._run_agent
        self.memory_search = memory_search or self._search_memory
        self.profile_search = profile_search or self._search_profile
        self.memory_store = memory_store or self._store_memory
        self.graph = self._compile()

    def _compile(self):
        builder = StateGraph(ChatState)
        builder.add_node("retrieve_memory", self._retrieve_memory)
        builder.add_node("route_intent", self._route_intent)
        builder.add_node("retrieve_knowledge", self._retrieve_knowledge)
        builder.add_node("invoke_agent", self._invoke_agent)
        builder.add_node("store_memory", self._store_completed_memory)
        builder.add_edge(START, "retrieve_memory")
        builder.add_edge("retrieve_memory", "route_intent")
        builder.add_edge("route_intent", "retrieve_knowledge")
        builder.add_edge("retrieve_knowledge", "invoke_agent")
        builder.add_edge("invoke_agent", "store_memory")
        builder.add_edge("store_memory", END)
        return builder.compile()

    def invoke(self, chat: ChatInput) -> ChatExecution:
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
        memories = profile = None
        try:
            memories = self.memory_search(state["conversation_id"], state["message"])
        except Exception:
            logger.warning("Memory retrieval failed; continuing without memory context.")
        if state.get("user_id") is not None:
            try:
                profile = self.profile_search(state["user_id"], state["message"])
            except Exception:
                logger.warning("Profile retrieval failed; continuing without profile context.")
        return {"memories_block": memories, "profile_block": profile}

    def _route_intent(self, state: ChatState) -> ChatState:
        route = self.router(state["message"])
        return {"intent": route.intent}

    def _retrieve_knowledge(self, state: ChatState) -> ChatState:
        from wenrun_ai.chains.qa import _build_human_message, knowledge_base_for_intent

        context = None
        base = knowledge_base_for_intent(state["intent"])
        if base is not None:
            try:
                context = self.retriever(state["message"], base)
            except Exception:
                logger.warning("RAG retrieval failed; continuing without knowledge context.")
                context = None
        return {"knowledge_context": context, "human_message": _build_human_message(
            state["message"], state.get("user_context"), state.get("memories_block"), state.get("profile_block"), context
        )}

    def _invoke_agent(self, state: ChatState) -> ChatState:
        with wenrun_api_context(state.get("api_key"), state.get("user_id")):
            outcome = self.agent_runner(state["intent"], state["human_message"], state)
        return {"status": "completed", "reply": result_reply(outcome)}

    def _store_completed_memory(self, state: ChatState) -> ChatState:
        reply = state.get("reply")
        if reply:
            try:
                self.memory_store(state["conversation_id"], state.get("user_id"), state["message"], reply)
            except Exception:
                logger.warning("Memory store failed; completed reply is preserved.")
        return {}

    @staticmethod
    def _search_memory(conversation_id: str, message: str) -> str | None:
        from wenrun_ai.memory import format_memories_for_prompt, search_memories_weighted
        return format_memories_for_prompt(search_memories_weighted(conversation_id, message))

    @staticmethod
    def _search_profile(user_id: int, message: str) -> str | None:
        from wenrun_ai.memory import format_profile_for_prompt, search_profile
        return format_profile_for_prompt(search_profile(user_id, message, top_k=5))

    @staticmethod
    def _store_memory(conversation_id: str, user_id: int | None, message: str, reply: str) -> None:
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
