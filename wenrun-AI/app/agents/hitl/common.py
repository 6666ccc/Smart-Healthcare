"""
[HITL] 公共工具：thread_id、中断解析、Agent 结果格式化。

Human-in-the-Loop 依赖 LangGraph checkpointer + 稳定 thread_id 才能跨请求 resume。
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from app.tools.client import api_call

logger = logging.getLogger(__name__)

_TOOL_TITLES = {
    "create_registration": "挂号确认",
    "pay_charge": "支付确认",
}


def _parse_api_data(raw: str) -> dict[str, Any] | None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _join_parts(*parts: str) -> str:
    return " · ".join(p for p in parts if p and str(p).strip())


def _build_registration_display(args: dict[str, Any]) -> dict[str, Any]:
    patient_id = str(args.get("patient_id") or "").strip()
    schedule_id = str(args.get("schedule_id") or "").strip()
    details: list[dict[str, str]] = []

    schedule = _parse_api_data(api_call("GET", f"/api/schedules/{schedule_id}")) if schedule_id else None
    if schedule:
        dept = str(schedule.get("deptName") or "")
        doctor = str(schedule.get("staffName") or "")
        work_date = str(schedule.get("workDate") or "")
        period = str(schedule.get("timePeriod") or "")
        fee = schedule.get("registerFee")
        remaining = schedule.get("remainingCount")

        summary = _join_parts(dept, doctor, work_date, period, f"{fee}元" if fee is not None else "")
        if dept:
            details.append({"label": "科室", "value": dept})
        if doctor:
            details.append({"label": "医生", "value": doctor})
        if work_date:
            details.append({"label": "日期", "value": work_date})
        if period:
            details.append({"label": "时段", "value": period})
        if fee is not None:
            details.append({"label": "挂号费", "value": f"{fee} 元"})
        if remaining is not None:
            details.append({"label": "剩余号源", "value": str(remaining)})
    else:
        summary = _join_parts(
            f"排班 {schedule_id}" if schedule_id else "",
            f"患者 {patient_id}" if patient_id else "",
        )

    if patient_id:
        details.append({"label": "患者 ID", "value": patient_id})

    return {
        "title": _TOOL_TITLES["create_registration"],
        "summary": summary or "请确认挂号信息",
        "details": details,
    }


def _build_pay_charge_display(args: dict[str, Any]) -> dict[str, Any]:
    charge_id = str(args.get("charge_id") or "").strip()
    pay_type = str(args.get("pay_type") or "").strip()
    paid_amount = str(args.get("paid_amount") or "").strip()
    pay_type_labels = {"1": "微信", "2": "支付宝", "3": "现金"}
    details: list[dict[str, str]] = []

    charge = _parse_api_data(api_call("GET", f"/api/charges/{charge_id}")) if charge_id else None
    if charge:
        amount = charge.get("totalAmount")
        order_no = str(charge.get("orderNo") or "")
        summary = _join_parts(
            f"订单 {order_no}" if order_no else f"订单 {charge_id}",
            f"{amount} 元" if amount is not None else "",
            pay_type_labels.get(pay_type, f"方式 {pay_type}") if pay_type else "",
        )
        if order_no:
            details.append({"label": "订单号", "value": order_no})
        if amount is not None:
            details.append({"label": "金额", "value": f"{amount} 元"})
    else:
        summary = _join_parts(
            f"订单 {charge_id}" if charge_id else "",
            f"{paid_amount} 元" if paid_amount else "",
        )

    if pay_type:
        details.append({"label": "支付方式", "value": pay_type_labels.get(pay_type, pay_type)})
    if paid_amount:
        details.append({"label": "实付金额", "value": f"{paid_amount} 元"})

    return {
        "title": _TOOL_TITLES["pay_charge"],
        "summary": summary or "请确认支付信息",
        "details": details,
    }


def enrich_pending_action(item: dict[str, Any]) -> dict[str, Any]:
    """[HITL] 为待确认操作补充面向患者的标题与摘要。"""
    tool = item.get("tool") or ""
    args = item.get("args") or {}
    enriched = dict(item)

    if tool == "create_registration":
        enriched.update(_build_registration_display(args))
    elif tool == "pay_charge":
        enriched.update(_build_pay_charge_display(args))
    else:
        enriched["title"] = _TOOL_TITLES.get(tool, "操作确认")
        enriched["summary"] = item.get("description") or tool
        enriched["details"] = []

    return enriched


def enrich_pending_actions(pending: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [enrich_pending_action(item) for item in pending]


# ========== [HITL] thread_id：与 session_id 绑定，resume 时必须一致 ==========
def resolve_hitl_thread_id(session_id: str | None, user_id: str | None) -> str:
    """将前端 session 映射为 LangGraph configurable.thread_id。"""
    if session_id and session_id.strip():
        return session_id.strip()
    if user_id and user_id.strip():
        logger.warning("[HITL] 未提供 session_id，回退为 user-%s（resume 可能不稳定）", user_id)
        return f"user-{user_id.strip()}"
    ephemeral = f"ephemeral-{uuid.uuid4()}"
    logger.warning("[HITL] 未提供 session_id/user_id，使用临时 thread_id=%s，无法 resume", ephemeral)
    return ephemeral


def hitl_run_config(session_id: str | None, user_id: str | None) -> dict[str, Any]:
    """[HITL] 构造 agent.invoke / resume 所需的 config。"""
    return {"configurable": {"thread_id": resolve_hitl_thread_id(session_id, user_id)}}


# ========== [HITL] 从 Agent 返回值中解析待人工确认的工具调用 ==========
def extract_hitl_pending_actions(result: Any) -> list[dict[str, Any]] | None:
    """
    解析 LangGraph 中断 payload（HumanInTheLoopMiddleware 写入的 HITLRequest）。

    返回示例::
        [{"tool": "create_registration", "args": {...}, "description": "...", "allowed_decisions": [...]}]
    """
    interrupts = None
    if isinstance(result, dict):
        interrupts = result.get("__interrupt__")

    if not interrupts:
        return None

    pending: list[dict[str, Any]] = []
    for intr in interrupts:
        payload = intr.value if hasattr(intr, "value") else intr
        if not isinstance(payload, dict):
            continue

        action_requests = payload.get("action_requests") or []
        review_configs = payload.get("review_configs") or []

        for index, action in enumerate(action_requests):
            review = review_configs[index] if index < len(review_configs) else {}
            pending.append(
                {
                    "tool": action.get("name"),
                    "args": action.get("args") or {},
                    "description": action.get("description") or "",
                    "allowed_decisions": review.get("allowed_decisions")
                    or ["approve", "reject", "edit"],
                }
            )

    return pending or None


def _message_text(message: Any) -> str:
    content = getattr(message, "content", "") or ""
    if isinstance(content, str):
        return content.strip()
    return str(content).strip()


def build_interrupt_user_message(pending_actions: list[dict[str, Any]]) -> str:
    """[HITL] 生成返回给前端的简短提示（详情由确认卡片展示）。"""
    enriched = enrich_pending_actions(pending_actions)
    first = enriched[0] if enriched else {}
    title = first.get("title") or "操作确认"
    summary = first.get("summary") or ""
    if summary:
        return f"请确认是否执行：**{title}** — {summary}"
    return f"请在下方的确认卡片中选择是否执行 **{title}**。"


# ========== [HITL] 统一格式化 Agent 执行结果（completed / interrupt） ==========
def format_hitl_agent_result(result: Any, thread_id: str) -> dict[str, Any]:
    pending = extract_hitl_pending_actions(result)

    if pending:
        enriched = enrich_pending_actions(pending)
        return {
            "hitl_status": "interrupt",
            "hitl_thread_id": thread_id,
            "hitl_pending_actions": enriched,
            "final_output": build_interrupt_user_message(pending),
        }

    messages: list[Any] = []
    if isinstance(result, dict):
        messages = result.get("messages") or []

    final_msg = messages[-1] if messages else None
    return {
        "hitl_status": "completed",
        "hitl_thread_id": thread_id,
        "hitl_pending_actions": None,
        "final_output": _message_text(final_msg) if final_msg else "",
    }
