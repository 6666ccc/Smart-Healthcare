import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.agents.hitl import resume_registration_with_hitl
from app.agents.router import router_graph
from app.schemas.chat import JavaChatRequest, JavaChatResumeRequest
from app.tools import set_patient_token

router = APIRouter(prefix="/java", tags=["Java 集成"])
logger = logging.getLogger(__name__)

def _serialize_router_result(result: dict) -> dict[str, Any]:
    """统一序列化路由图结果（含 [HITL] 字段）。"""
    payload: dict[str, Any] = {
        "user_input": result.get("user_input"),
        "intent": result.get("intent"),
        "target_agent": result.get("target_agent"),
        "confidence": result.get("confidence"),
        "reasoning": result.get("reasoning"),
        "final_output": result.get("final_output"),
        "session_id": result.get("session_id"),
    }

    # [HITL] 若 registration_agent 触发中断，以下字段供前端展示确认 UI
    hitl_status = result.get("hitl_status")
    if hitl_status:
        payload["hitl_status"] = hitl_status
        payload["hitl_thread_id"] = result.get("hitl_thread_id")
        payload["hitl_pending_actions"] = result.get("hitl_pending_actions")

    return payload


def _serialize_hitl_result(hitl_result: dict[str, Any], session_id: str | None) -> dict[str, Any]:
    """[HITL] 序列化 resume 接口返回值。"""
    return {
        "session_id": session_id,
        "hitl_status": hitl_result.get("hitl_status"),
        "hitl_thread_id": hitl_result.get("hitl_thread_id"),
        "hitl_pending_actions": hitl_result.get("hitl_pending_actions"),
        "final_output": hitl_result.get("final_output"),
    }


def _extract_user_access_token(request: JavaChatRequest | JavaChatResumeRequest, http_request: Request) -> str | None:
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
    content = (request.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="消息不能为空")

    access_token = _extract_user_access_token(request, http_request)
    set_patient_token(access_token)
    try:
        result = router_graph.invoke(
            content,
            user_id=request.user_id,
            session_id=request.session_id,
        )
        return _serialize_router_result(result)
    except Exception as exc:
        logger.exception("路由图执行失败")
        raise HTTPException(status_code=500, detail=f"路由图执行失败: {exc}") from exc
    finally:
        set_patient_token(None)


# ========== [HITL] 恢复中断的挂号 Agent（用户确认 / 拒绝 / 修改后调用） ==========
@router.post("/chat/resume")
async def java_chat_resume(request: JavaChatResumeRequest, http_request: Request) -> dict[str, Any]:
    """
    [HITL] 恢复被 HumanInTheLoopMiddleware 中断的 Agent 执行。

    典型流程：
    1. POST /java/chat → 返回 hitl_status=interrupt + hitl_pending_actions
    2. 前端展示确认 UI，用户选择 approve/reject/edit
    3. POST /java/chat/resume → 携带相同 session_id 与 decisions
    4. 若仍有写操作待确认，可能再次返回 interrupt；否则 hitl_status=completed
    """
    access_token = _extract_user_access_token(request, http_request)
    set_patient_token(access_token)
    try:
        hitl_result = resume_registration_with_hitl(
            session_id=request.session_id,
            user_id=request.user_id,
            decisions=request.to_hitl_decisions(),
        )
        return _serialize_hitl_result(hitl_result, request.session_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("[HITL] resume 失败")
        raise HTTPException(status_code=500, detail=f"[HITL] resume 失败: {exc}") from exc
    finally:
        set_patient_token(None)
