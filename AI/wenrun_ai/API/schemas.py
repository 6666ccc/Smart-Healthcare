from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    """与 Java ChatRequestDTO 对齐：AiChatController 注入 apiKey 后转发至本服务。

    apiKey 由 Java 从 AiServiceProperties 注入，供 AI 服务回调 Java 时鉴权。
    其余字段均为可选，向后兼容仅含 message 的旧请求。
    """


    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "message": "帮我查一下最近的挂号记录",
                    "apiKey": "wenrun-ai-internal-key-2026",
                    "userId": 12,
                    "username": "patient01",
                    "realName": "王小明",
                    "roleCode": "patient",
                    "portalType": "patient",
                    "patientId": 5,
                    "patientNo": "P20260001",
                    "patientName": "王小明",
                    "patientGender": 1,
                    "patientBirthDate": "1990-05-20",
                    "patientAllergyHistory": "青霉素",
                }
            ]
        },
    )

    message: str = Field(..., min_length=1)

    api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("apiKey", "api_key"),
        description="Java 注入的内部 API Key，用于 AI 服务回调 Java 时鉴权（X-Api-Key 头）",
    )

    # 保留 token 字段以兼容旧调用方
    token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("token", "accessToken", "access_token"),
        description="已废弃：改用 apiKey。保留仅用于向后兼容",
    )

    # 用户上下文（Java 从 token → userId → 查库注入）
    user_id: int | None = Field(default=None, alias="userId")
    username: str | None = None
    real_name: str | None = Field(default=None, alias="realName")
    role_code: str | None = Field(
        default=None,
        alias="roleCode",
        description='doctor / patient / admin / cashier / pharmacist 等',
    )
    portal_type: str | None = Field(
        default=None,
        alias="portalType",
        description="doctor / patient / admin",
    )

    # 医生端（roleCode 或 portalType 为 doctor 时有值）
    staff_id: int | None = Field(default=None, alias="staffId")

    # 患者端（roleCode 或 portalType 为 patient 时有值）
    patient_id: int | None = Field(default=None, alias="patientId")
    patient_no: str | None = Field(default=None, alias="patientNo")
    patient_name: str | None = Field(default=None, alias="patientName")
    patient_gender: int | None = Field(
        default=None,
        alias="patientGender",
        description="0 女 / 1 男 / 2 未知",
    )
    patient_birth_date: str | None = Field(
        default=None,
        alias="patientBirthDate",
        description='ISO 日期，如 "1990-05-20"',
    )
    patient_allergy_history: str | None = Field(
        default=None,
        alias="patientAllergyHistory",
    )

    # 记忆功能（Java 前端管理会话 ID）
    conversation_id: str | None = Field(
        default=None,
        alias="conversationId",
        description="会话唯一标识，由前端新建对话时生成 UUID。为 None 时退化为无记忆模式。",
    )


class ChatResponse(BaseModel):
    reply: str


class ChatExecutionResponse(BaseModel):
    """Public representation of a completed or approval-pending chat turn."""

    model_config = ConfigDict(populate_by_name=True)

    reply: str | None = None
    status: Literal["completed", "pending"]
    conversation_id: str = Field(..., alias="conversationId")
    interrupts: list[dict[str, Any]] = Field(default_factory=list)


class ChatResumeRequest(BaseModel):
    """Decision submitted by the authenticated principal for a paused turn."""

    model_config = ConfigDict(populate_by_name=True)

    conversation_id: str = Field(..., alias="conversationId", min_length=1)
    decision: dict[str, Any]
    api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("apiKey", "api_key"),
    )
    user_id: int | None = Field(default=None, alias="userId")
