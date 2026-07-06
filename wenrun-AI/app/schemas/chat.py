from typing import Any

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
