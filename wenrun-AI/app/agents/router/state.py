from typing import Optional, TypedDict

from langchain_core.messages import BaseMessage


class RouterState(TypedDict):
    """LangGraph 主图在各节点之间传递的共享状态。

    输入来源：RouterGraph.invoke 创建初始 RouterState，后续节点返回部分字段更新。
    处理方式：LangGraph 会把节点返回的 dict 合并回当前 state，再传给下一个节点。
    输出用途：API 层最终读取 intent、final_output、status、interrupts 返回给 Java 后端。
    """

    # LangChain 消息列表，保存模型或工具 Agent 返回的消息对象。
    messages: list[BaseMessage]

    # 用户本轮输入的原始文本，来自 POST /java/chat 的 content 字段。
    user_input: str

    # user_id 用于记忆检索和存储；session_id 同时作为 LangGraph 的 thread_id。
    user_id: Optional[str]
    session_id: Optional[str]

    # 意图识别节点写入的路由结果，用来决定下一步进入哪个 Agent。
    intent: Optional[str]
    status: Optional[str]              # "pending" 表示等用户确认；"completed" 表示本轮完成。
    interrupts: Optional[list[dict]]   # 返回前端的待确认操作列表，已转换成可展示的 JSON dict。
    target_agent: Optional[str]
    confidence: Optional[float]
    reasoning: Optional[str]

    # 记忆节点生成的上下文文本，会被拼进意图识别和聊天 Agent 的 system prompt。
    memory_context: Optional[str]

    # 最终回复文本，API 层主要读取这个字段作为本轮助手回答。
    final_output: Optional[str]

    # HITL 内部字段：registration_agent 写入，handle_tool_hitl 消费。
    # 这个字段不直接给用户看，用来判断主图是否需要暂停等待人工确认。
    _pending_interrupts: Optional[list[dict]]
