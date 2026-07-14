"""Human-in-the-loop policy and payload helpers for write tools."""

from typing import Any


_DECISIONS = ["approve", "edit", "reject"]

_TOOL_LABELS = {
    "create_patient": "创建患者",
    "create_registration": "创建挂号",
    "cancel_registration": "取消挂号",
    "start_visit": "开始就诊",
    "update_visit": "更新就诊",
    "create_exam_request": "创建检查申请",
    "create_prescription": "创建处方",
    "cancel_prescription": "取消处方",
    "create_charge_from_visit": "创建就诊费用",
    "pay_charge": "支付费用",
    "dispense_prescription": "发放处方药品",
}

WRITE_TOOL_POLICIES = {
    tool: {"allowed_decisions": list(_DECISIONS)} for tool in _TOOL_LABELS
}


def format_interrupt(tool: str, args: dict[str, Any]) -> dict[str, Any]:
    """Return the stable UI payload for a protected tool invocation."""
    policy = _policy_for(tool)
    if not isinstance(args, dict):
        raise ValueError("Tool arguments must be an object.")

    title = _TOOL_LABELS[tool]
    details = [
        {"key": key, "label": key.replace("_", " "), "value": value}
        for key, value in args.items()
    ]
    return {
        "tool": tool,
        "args": args,
        "allowedDecisions": list(policy["allowed_decisions"]),
        "title": title,
        "summary": f"请确认是否执行：{title}",
        "details": details,
    }


def normalize_decision(tool: str, payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Validate a user decision and adapt it to HumanInTheLoopMiddleware."""
    policy = _policy_for(tool)
    if not isinstance(payload, dict):
        raise ValueError("Decision payload must be an object.")

    decision = payload.get("decision")
    if decision not in policy["allowed_decisions"]:
        raise ValueError("Unsupported decision.")

    normalized: dict[str, Any] = {"type": decision}
    if decision == "edit":
        args = payload.get("args")
        if not isinstance(args, dict):
            raise ValueError("Edit decisions require object args.")
        normalized["edited_action"] = {"name": tool, "args": args}
    elif decision == "reject":
        message = payload.get("message")
        if not isinstance(message, str) or not message.strip():
            raise ValueError(f"{decision.title()} decisions require a message.")
        normalized["message"] = message

    return {"decisions": [normalized]}


def _policy_for(tool: str) -> dict[str, list[str]]:
    try:
        return WRITE_TOOL_POLICIES[tool]
    except KeyError as exc:
        raise ValueError(f"Unsupported protected tool: {tool}") from exc
