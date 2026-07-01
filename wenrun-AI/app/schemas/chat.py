from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class JavaChatRequest(BaseModel):
    content: str
    user_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    session_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("session_id", "sessionId"),
    )
    extra: dict[str, Any] | None = None

    model_config = ConfigDict(populate_by_name=True)


# ========== [HITL] 用户决策模型（对应 HumanInTheLoopMiddleware Decision 类型） ==========
class HitlEditedAction(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class HitlDecision(BaseModel):
    """
    [HITL] 人工决策。

    - approve: 原样执行工具
    - reject: 拒绝执行（可选 message 说明原因）
    - edit: 修改工具参数后执行（需 edited_action）
    - respond: 代替工具返回内容（用于 ask 类工具，当前未启用）
    """

    type: Literal["approve", "reject", "edit", "respond"]
    message: str | None = None
    edited_action: HitlEditedAction | None = None

    model_config = ConfigDict(populate_by_name=True)


class JavaChatResumeRequest(BaseModel):
    """[HITL] POST /java/chat/resume 请求体。"""

    session_id: str = Field(
        validation_alias=AliasChoices("session_id", "sessionId"),
        description="必须与触发中断时的 session_id 一致",
    )
    user_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    decisions: list[HitlDecision] = Field(
        min_length=1,
        description="与 hitl_pending_actions 数量一致，按顺序对应",
    )
    extra: dict[str, Any] | None = None

    model_config = ConfigDict(populate_by_name=True)

    def to_hitl_decisions(self) -> list[dict[str, Any]]:
        """[HITL] 转为 LangGraph Command(resume=...) 所需的 decisions 列表。"""
        payload: list[dict[str, Any]] = []
        for item in self.decisions:
            decision: dict[str, Any] = {"type": item.type}
            if item.message:
                decision["message"] = item.message
            if item.edited_action is not None:
                decision["edited_action"] = item.edited_action.model_dump()
            payload.append(decision)
        return payload
