import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.agents.router import router_graph
from app.schemas.chat import JavaChatRequest
from app.tools import set_patient_token

router = APIRouter(prefix="/java", tags=["Java 集成"])
logger = logging.getLogger(__name__)


def _serialize_router_result(result: dict) -> dict[str, Any]:
    """统一序列化路由图结果。"""
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
async def java_chat(request: JavaChatRequest, http_request: Request) -> dict[str, Any]:
    # 第 1 步：校验用户消息不能为空
    raw_content = request.content
    if raw_content is None:
        raw_content = ""
    content = raw_content.strip()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="消息不能为空")

    # 第 2 步：提取 token，供路由图里患者工具调用
    access_token = _extract_user_access_token(request, http_request)
    set_patient_token(access_token)

    try:
        # 第 3 步：调用路由图
        result = router_graph.invoke(
            content,
            user_id=request.user_id,
            session_id=request.session_id,
        )

        # 第 4 步：转成 API 响应
        response = _serialize_router_result(result)
        return response

    except Exception as exc:
        logger.exception("路由图执行失败")
        error_detail = f"路由图执行失败: {exc}"
        raise HTTPException(status_code=500, detail=error_detail) from exc

    finally:
        # 第 5 步：清理 token，避免影响后续请求
        set_patient_token(None)
