from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class JavaChatRequest(BaseModel):
    """POST /java/chat 请求体：Java 后端转发给 Python 路由图的聊天输入。

    输入来源：Java 后端或前端提交的 JSON。
    处理规则：user_id/userId、session_id/sessionId 两种命名都能被 Pydantic 接收。
    输出用途：java_chat 路由函数读取 content、user_id、session_id、extra 后调用 router_graph.invoke。
    """

    # 用户原始问题文本，进入 RouterState.user_input。
    content: str

    # 支持 snake_case 和 camelCase，是为了兼容 Python 与 Java 两侧字段命名习惯。
    user_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    session_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("session_id", "sessionId"),
    )

    # extra 用来承载扩展字段，例如 access_token；没有固定结构时先保留 dict。
    extra: dict[str, Any] | None = None

    model_config = ConfigDict(populate_by_name=True)


class JavaHitlResumeRequest(BaseModel):
    """POST /java/chat/resume 请求体：恢复一次被 HITL 暂停的主图。

    输入来源：前端展示 interrupts 后，用户点击确认、拒绝或补充说明。
    处理规则：session_id/sessionId 都可接收；decision 保留为 dict 以兼容 LangGraph HITL 载荷。
    输出用途：java_chat_resume 将 decision 传给 router_graph.resume。
    """

    # 必须与首次 /java/chat 使用的 session_id 一致，否则 checkpointer 找不到暂停点。
    session_id: str = Field(
        validation_alias=AliasChoices("session_id", "sessionId"),
    )

    # 示例：{"type": "approve"}、{"type": "reject", "message": "..."}。
    decision: dict[str, Any]

    model_config = ConfigDict(populate_by_name=True)
