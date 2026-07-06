import logging

from langgraph.graph import END, START, StateGraph

from app.agents.router.nodes import (
    analyze_intent,
    chat_agent,
    decide_next_node,
    fallback,
    medical_agent,
    registration_agent,
    retrieve_memory,
    store_memory,
)
from app.agents.router.state import RouterState

logger = logging.getLogger(__name__)

_builder = StateGraph(RouterState)
_builder.add_node("retrieve_memory", retrieve_memory)
_builder.add_node("analyze_intent", analyze_intent)
_builder.add_node("medical_agent", medical_agent)
_builder.add_node("registration_agent", registration_agent)
_builder.add_node("chat_agent", chat_agent)
_builder.add_node("fallback", fallback)
_builder.add_node("store_memory", store_memory)


_builder.add_edge(START, "retrieve_memory") #首先调用检索记忆节点
_builder.add_edge("retrieve_memory", "analyze_intent") #然后调用分析意图节点(该节点内置一个LLM模型，用于分析用户意图)
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
_builder.add_edge("registration_agent", "store_memory")
_builder.add_edge("chat_agent", "store_memory")
_builder.add_edge("fallback", "store_memory")
_builder.add_edge("store_memory", END)

_GRAPH = _builder.compile()


class RouterGraph:
    #用于初始化路由图
    def __init__(self, graph=_GRAPH):
        self.graph = graph #将_GRAPH赋值给self.graph

    #用于调用路由图
    def invoke(
        self,
        user_input: str,
        user_id: str | None = None,
        session_id: str | None = None,
    ) -> dict:
        logger.info("路由图开始 | user_input=%r user_id=%s", user_input, user_id)

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


        result = self.graph.invoke(initial)

        logger.info(
            "路由图完成 | intent=%s target_agent=%s",
            result.get("intent"),
            result.get("target_agent"),
        )
        return result


router_graph = RouterGraph()
