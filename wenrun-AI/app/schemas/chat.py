from pydantic import BaseModel


class ChatRequest(BaseModel):
    """聊天请求实体 —— 相当于 Java 的 Entity"""
    content: str
    user_id: str | None = None
    session_id: str | None = None


class ChatResponse(BaseModel):
    """聊天响应实体"""
    reply: str
    session_id: str | None = None
