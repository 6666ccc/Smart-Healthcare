from typing import Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.schemas.response import ResponseModel
from app.schemas.chat import ChatRequest
from app.chains.base_chain import process_chat, process_chat_stream


class JavaChatRequest(BaseModel):
    """Java端传来的 JSON 请求体"""
    content: str
    user_id: str | None = None
    session_id: str | None = None
    extra: dict[str, Any] | None = None


router = APIRouter(prefix="/java", tags=["java 接口调用"])


@router.post("/chat")
async def process_query(
    request: JavaChatRequest,
):
    """
    非流式接口：接收 Java JSON 请求，调用 AI 处理后统一返回结果。
    """
    try:
        chat_request = ChatRequest(
            content=request.content,
            user_id=request.user_id,
            session_id=request.session_id,
        )

        chat_response = process_chat(chat_request)

        return ResponseModel(data=chat_response.model_dump())

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def process_query_stream(
    request: JavaChatRequest,
):
    """
    流式接口：接收 Java JSON 请求，通过 SSE 逐块推送 AI 回复。
    Java 端可以用 HttpClient + 流式读取来处理返回流。
    """
    chat_request = ChatRequest(
        content=request.content,
        user_id=request.user_id,
        session_id=request.session_id,
    )

    return StreamingResponse(
        process_chat_stream(chat_request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁止 Nginx 缓冲
        },
    )
