"""LangGraph orchestration for routing, RAG, agent execution and HITL."""

from __future__ import annotations

from collections.abc import Callable
import logging
from typing import Any

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from wenrun_ai.chains.router import Intent, route_intent
from wenrun_ai.graph.hitl import format_interrupt, normalize_decision
from wenrun_ai.graph.nodes import normalize_conversation_id, result_interrupts, result_reply
from wenrun_ai.graph.nodes import scoped_thread_id
from wenrun_ai.graph.state import ChatExecution, ChatInput, ChatState
from wenrun_ai.knowledge.retriever import retrieve_knowledge_context
from wenrun_ai.auth_context import wenrun_api_context


logger = logging.getLogger(__name__)


class ChatWorkflow:
    """A resumable StateGraph with injectable integrations for reliable testing."""

    def __init__(
        self,
        *,
        router: Callable[[str], Any] = route_intent,
        retriever: Callable[[str, Any], str | None] = retrieve_knowledge_context,
        agent_runner: Callable[[Intent, HumanMessage, ChatState, dict[str, Any] | None], Any] | None = None,
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
        self.checkpointer = InMemorySaver()
        self.graph = self._compile()

    def _compile(self):
        builder = StateGraph(ChatState)
        builder.add_node("retrieve_memory", self._retrieve_memory)
        builder.add_node("route_intent", self._route_intent)
        builder.add_node("retrieve_knowledge", self._retrieve_knowledge)
        builder.add_node("invoke_agent", self._invoke_agent)
        builder.add_node("pause", self._pause)
        builder.add_node("store_memory", self._store_completed_memory)
        builder.add_edge(START, "retrieve_memory")
        builder.add_edge("retrieve_memory", "route_intent")
        builder.add_edge("route_intent", "retrieve_knowledge")
        builder.add_edge("retrieve_knowledge", "invoke_agent")
        builder.add_conditional_edges("invoke_agent", self._next_step, {"pause": "pause", "store": "store_memory"})
        builder.add_conditional_edges("pause", self._next_step, {"pause": "pause", "store": "store_memory"})
        builder.add_edge("store_memory", END)
        return builder.compile(checkpointer=self.checkpointer)

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
            "interrupts": [],
        }
        result = self.graph.invoke(state, config={"configurable": {"thread_id": thread_id}})
        return self._execution(result, conversation_id)

    def resume(self, conversation_id: str | None, decision: dict[str, Any], *, user_id: int | None = None, api_key: str | None = None) -> ChatExecution:
        if not conversation_id or not conversation_id.strip():
            raise LookupError("A pending conversation_id is required.")
        public_id = normalize_conversation_id(conversation_id)
        thread_id = scoped_thread_id(public_id, user_id)
        config = {"configurable": {"thread_id": thread_id}}
        snapshot = self.graph.get_state(config)
        if not snapshot.values or not snapshot.next:
            raise LookupError("No pending interaction exists for this conversation.")
        # Validate before resuming the interrupt so malformed input cannot
        # consume or corrupt the saved checkpoint.
        self._normalize_pending_decisions(snapshot.values.get("interrupts", []), decision)
        command = Command(resume=decision, update={"api_key": api_key}) if api_key is not None else Command(resume=decision)
        result = self.graph.invoke(command, config=config)
        return self._execution(result, public_id)

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
        outcome = self._call_agent(state, None)
        return self._outcome(outcome)

    def _pause(self, state: ChatState) -> ChatState:
        payload = interrupt({"interrupts": state["interrupts"]})
        normalized = self._normalize_pending_decisions(state["interrupts"], payload)
        outcome = self._call_agent(state, normalized)
        return self._outcome(outcome)

    def _call_agent(self, state: ChatState, decision: dict[str, Any] | None):
        with wenrun_api_context(state.get("api_key"), state.get("user_id")):
            return self.agent_runner(state["intent"], state["human_message"], state, decision)

    @staticmethod
    def _normalize_pending_decisions(interrupts: list[dict[str, Any]], payload: dict[str, Any]) -> dict[str, Any]:
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
                raise ValueError("Requested decision is not allowed for this pending action.")
            decisions.extend(normalize_decision(action["tool"], decision)["decisions"])
        return {"decisions": decisions}

    def _outcome(self, outcome: Any) -> ChatState:
        pending = result_interrupts(outcome)
        if pending:
            formatted = []
            for item in pending:
                if item.get("summary"):
                    formatted.append(item)
                    continue
                payload = format_interrupt(item["tool"], item.get("args", {}))
                allowed = item.get("allowedDecisions")
                if isinstance(allowed, list) and all(isinstance(choice, str) for choice in allowed):
                    payload["allowedDecisions"] = allowed
                formatted.append(payload)
            return {"status": "pending", "interrupts": formatted, "reply": None}
        return {"status": "completed", "interrupts": [], "reply": result_reply(outcome)}

    @staticmethod
    def _next_step(state: ChatState) -> str:
        return "pause" if state.get("status") == "pending" else "store"

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
    def _run_agent(intent: Intent, human_message: HumanMessage, state: ChatState, decision: dict[str, Any] | None = None):
        from wenrun_ai.chains.qa import get_agent
        agent = get_agent(intent)
        config = {"configurable": {"thread_id": state["thread_id"]}}
        if decision is not None:
            return agent.invoke(Command(resume=decision), config=config)
        return agent.invoke({"messages": [human_message]}, config=config)

    @staticmethod
    def _execution(result: ChatState, conversation_id: str) -> ChatExecution:
        return ChatExecution(status=result.get("status", "completed"), conversation_id=conversation_id,
                             reply=result.get("reply"), intent=result.get("intent"),
                             interrupts=result.get("interrupts", []))
