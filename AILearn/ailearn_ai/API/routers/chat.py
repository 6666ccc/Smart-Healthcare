import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from ailearn_ai.settings import base

from ...chains.qa import aiter_chat_events, run_chat
from ..user_context import build_user_context_block
from ..schemas import ChatRequest, ChatResponse

router = APIRouter()
api_logger = logging.getLogger("ailearn_ai.api")


def _resolve_api_key(body: ChatRequest) -> tuple[str | None, str]:
    """解析内部 API Key，返回 (api_key, 来源)。来源: body | env | none。

    Java AiChatController 从 AiServiceProperties 注入 apiKey 到 DTO body。
    """
    if body.api_key and str(body.api_key).strip():
        return body.api_key.strip(), "body"

    env_key = base.get_huiliao_api_key()
    if env_key:
        return env_key, "env"

    return None, "none"


@router.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest, request: Request) -> ChatResponse:
    """聊天接口。

    预期链路（与 Java AiChatController + AiServiceClient 一致）：
    Java POST /v1/chat body=ChatRequestDTO（含 apiKey + message + 用户/患者上下文）
    → 本接口解析 body.apiKey → Agent → Tools 回调 Java 时带 X-Api-Key + X-User-Id
    """
    api_key, source = _resolve_api_key(body)
    user_context = build_user_context_block(body)

    if source == "none":
        api_logger.warning(
            "POST /v1/chat 未获得 apiKey（请在 body.apiKey"
            " 或 .env 的 HUILIAO_API_KEY 中提供），回调 Java 将返回 401",
        )
    else:
        api_logger.info(
            "POST /v1/chat | message_len=%d | user_id=%s | role=%s | portal=%s"
            " | has_patient_ctx=%s | api_key_source=%s | conversation_id=%s",
            len(body.message),
            body.user_id,
            body.role_code,
            body.portal_type,
            body.patient_id is not None,
            source,
            body.conversation_id,
        )

    reply = run_chat(
        body.message,
        api_key=api_key,
        user_id=body.user_id,
        patient_id=body.patient_id,
        user_context=user_context,
        conversation_id=body.conversation_id,
    )
    api_logger.info("POST /v1/chat 完成 | reply_len=%d", len(reply))
    return ChatResponse(reply=reply)


@router.post("/chat/stream")
async def post_chat_stream(body: ChatRequest, request: Request) -> StreamingResponse:
    """SSE 流式聊天：data 行为 JSON，type 为 status / token / done。"""
    api_key, source = _resolve_api_key(body)
    user_context = build_user_context_block(body)

    if source == "none":
        api_logger.warning(
            "POST /v1/chat/stream 未获得 apiKey（请在 body.apiKey"
            " 或 .env 的 HUILIAO_API_KEY 中提供），回调 Java 将返回 401",
        )
    else:
        api_logger.info(
            "POST /v1/chat/stream | message_len=%d | user_id=%s | conversation_id=%s",
            len(body.message),
            body.user_id,
            body.conversation_id,
        )

    async def event_generator():
        try:
            async for event in aiter_chat_events(
                body.message,
                api_key=api_key,
                user_id=body.user_id,
                patient_id=body.patient_id,
                user_context=user_context,
                conversation_id=body.conversation_id,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as exc:
            api_logger.exception("POST /v1/chat/stream 异常")
            error_event = {"type": "error", "content": str(exc)}
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
