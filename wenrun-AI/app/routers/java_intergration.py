from typing import Any
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from app.graphs.router_graph import router_graph
from app.tools.patient import set_patient_token


class JavaChatRequest(BaseModel):
    """Java 端传来的 JSON 请求体（兼容 camelCase / snake_case）。"""

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


router = APIRouter(prefix="/java", tags=["java 接口调用"])
logger = logging.getLogger(__name__)


def _serialize_router_result(result: dict) -> dict:
    """剥离 LangChain Message 等不可 JSON 序列化的字段。

    注：memory_context 不返回给 Java 端（仅内部使用，避免暴露用户隐私数据）。
    """
    return {
        "user_input": result.get("user_input"),
        "intent": result.get("intent"),
        "target_agent": result.get("target_agent"),
        "confidence": result.get("confidence"),
        "reasoning": result.get("reasoning"),
        "final_output": result.get("final_output"),
        "session_id": result.get("session_id"),
    }


def _extract_user_access_token(request: JavaChatRequest, http_request: Request) -> str | None:
    """解析用户 access_token：优先 extra，其次 Authorization / X-Token 请求头。"""
    if request.extra:
        token = request.extra.get("access_token")
        if isinstance(token, str) and token.strip():
            return token.strip()

    auth = http_request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        bearer = auth[7:].strip()
        if bearer:
            return bearer

    x_token = http_request.headers.get("X-Token", "").strip()
    return x_token or None


@router.post("/chat")
async def java_chat(request: JavaChatRequest, http_request: Request) -> dict:
    """
    非流式接口：接收 Java 端 JSON 请求，走路由图分析意图 + 分发给子 Agent，
    返回可序列化的路由结果（intent / target_agent / final_output 等）。

    用户 access_token 由 Java AiChatController 注入 extra.access_token，
    用于患者业务 API 调用时携带用户身份。
    """
    content = (request.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="消息不能为空")

    access_token = _extract_user_access_token(request, http_request)
    logger.info(
        "收到 Java 聊天请求 | user_id=%s session_id=%s content_len=%d has_token=%s",
        request.user_id,
        request.session_id,
        len(content),
        bool(access_token),
    )
    set_patient_token(access_token)
    try:
        # 将 user_id 与 session_id 传入路由图，使记忆功能可以按用户隔离存储与检索
        result = router_graph.invoke(
            content,
            user_id=request.user_id,
            session_id=request.session_id,
        )
        serialized = _serialize_router_result(result)
        logger.info(
            "Java 聊天响应 | intent=%s target_agent=%s confidence=%s session_id=%s",
            serialized.get("intent"),
            serialized.get("target_agent"),
            serialized.get("confidence"),
            serialized.get("session_id"),
        )
        return serialized
    except Exception as exc:
        logger.exception("路由图执行失败")
        raise HTTPException(status_code=500, detail=f"路由图执行失败: {exc}") from exc
    finally:
        set_patient_token(None)
