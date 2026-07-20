import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.agents.router import router_graph
from app.schemas.chat import JavaChatRequest, JavaHitlResumeRequest
from app.tools import set_patient_token

router = APIRouter(prefix="/java", tags=["Java 集成"])
logger = logging.getLogger(__name__)


def _serialize_router_result(result: dict) -> dict[str, Any]:
    """将路由图 invoke 返回的 RouterState dict 转为 Java 端可消费的 JSON 字段。

    输入：router_graph.invoke 返回的 RouterState，字段来自各个 LangGraph 节点。
    处理：只挑 Java 后端和前端需要展示的字段，避免把内部字段 _pending_interrupts 泄露出去。
    输出：含 intent、final_output、status、interrupts 等字段的 JSON dict。
    """
    return {
        "user_input": result.get("user_input"),
        "intent": result.get("intent"),
        "target_agent": result.get("target_agent"),
        "confidence": result.get("confidence"),
        "reasoning": result.get("reasoning"),
        "final_output": result.get("final_output"),
        "session_id": result.get("session_id"),
        "status": result.get("status", "completed"),
        "interrupts": result.get("interrupts") or [],
    }


def _extract_user_access_token(
    request: JavaChatRequest, http_request: Request
) -> str | None:
    """从聊天请求体和 HTTP 头中提取 token。

    输入：POST /java/chat 的 Pydantic 请求体，以及 FastAPI Request。
    输出：患者 access_token 或 None，供 set_patient_token 写入本次请求上下文。
    """
    return _extract_access_token(http_request, request.extra)

def _extract_access_token(
    http_request: Request,
    extra: dict[str, Any] | None = None,
) -> str | None:
    """从请求 extra、Authorization Bearer 或 X-Token 中提取患者 access_token。

    输入：
    - http_request：FastAPI 原始请求，可读取 HTTP headers。
    - extra：JavaChatRequest.extra，可由 Java 后端显式传 access_token。

    处理顺序：extra.access_token -> Authorization: Bearer xxx -> X-Token。
    输出：去掉首尾空格后的 token 字符串；三个来源都没有时返回 None。
    """
    if extra:
        token = extra.get("access_token")
        if isinstance(token, str) and token.strip():
            return token.strip()

    auth = http_request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        bearer = auth[7:].strip()
        if bearer:
            return bearer

    x_token = http_request.headers.get("X-Token", "").strip()
    return x_token or None


def _serialize_hitl_result(result: dict) -> dict[str, Any]:
    """将 router_graph.resume 返回值转为 POST /java/chat/resume 的 JSON 响应。

    输入：恢复后的 RouterState dict，可能是 completed，也可能再次 pending。
    处理：只保留前端继续渲染所需的会话、状态、中断列表和最终回复。
    输出：session_id、status、interrupts、final_output。
    """
    return {
        "session_id": result.get("session_id"),
        "status": result.get("status", "completed"),
        "interrupts": result.get("interrupts") or [],
        "final_output": result.get("final_output"),
    }


@router.post("/chat")
async def java_chat(request: JavaChatRequest, http_request: Request) -> dict[str, Any]:
    """Java 集成聊天入口：把 Java 请求送进 LangGraph 路由图。

    输入：JavaChatRequest，其中 content 是用户问题，user_id/session_id 用于记忆和 HITL 恢复。
    处理：校验文本 -> 注入患者 token -> 调用 router_graph.invoke -> 序列化返回值。
    输出：普通聊天时返回 final_output；需要人工确认工具时返回 status=pending + interrupts。
    """
    # 第 1 步：把 None 和纯空白统一处理成“空消息”，方便返回明确的 400 错误。
    raw_content = request.content
    if raw_content is None:
        raw_content = ""
    content = raw_content.strip()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="消息不能为空")

    # 第 2 步：提取患者 token，供路由图里的患者工具调用 Java 业务接口。
    # token 放在模块级变量里，所以必须在 finally 中清理。
    access_token = _extract_user_access_token(request, http_request)
    set_patient_token(access_token)

    try:
        # 第 3 步：调用路由图。
        # session_id 会变成 LangGraph thread_id，后续 /chat/resume 必须使用同一个值。
        result = router_graph.invoke(
            content,
            user_id=request.user_id,
            session_id=request.session_id,
        )

        # 第 4 步：把 RouterState 转成稳定的 API 响应结构。
        response = _serialize_router_result(result)
        return response

    except Exception as exc:
        logger.exception("路由图执行失败")
        error_detail = f"路由图执行失败: {exc}"
        raise HTTPException(status_code=500, detail=error_detail) from exc

    finally:
        # 第 5 步：清理 token，避免当前患者身份串到后续请求。
        set_patient_token(None)


# HITL 恢复入口：
# 前端在用户点击 approve / reject / respond 后，把 decision 和同一个 session_id 发回来。
# 主图用 session_id 找回上次 interrupt() 暂停的 checkpoint，再把 decision 注入暂停点继续执行。
@router.post("/chat/resume")
async def java_chat_resume(
    request: JavaHitlResumeRequest,
    http_request: Request,
) -> dict[str, Any]:
    """HITL 恢复：继续执行上一次被人工确认暂停的路由图。

    输入：session_id 指向暂停的主图 checkpoint；decision 是用户对工具调用的选择。
    处理：校验恢复参数 -> 注入 token -> router_graph.resume -> 序列化结果。
    输出：完成时返回 final_output；多轮确认时继续返回 status=pending + interrupts。
    """
    session_id = request.session_id.strip()

    if len(session_id) == 0:
        raise HTTPException(status_code=400, detail="session_id 不能为空")

    if not request.decision:
        raise HTTPException(status_code=400, detail="decision 不能为空")

    # resume 期间工具 Agent 可能继续调用 Java 业务接口，所以也需要临时注入 token。
    access_token = _extract_access_token(http_request, request.extra)
    set_patient_token(access_token)

    try:
        result = router_graph.resume(
            session_id=session_id,
            decision=request.decision,
        )
        return _serialize_hitl_result(result)

    except Exception as exc:
        logger.exception("HITL resume 失败")
        error_detail = f"HITL resume 失败: {exc}"
        raise HTTPException(status_code=500, detail=error_detail) from exc

    finally:
        set_patient_token(None)
