import uuid
from typing import Any

from langchain_core.runnables import RunnableConfig


HITL_TOOL_POLICIES: dict[str, dict[str, Any]] = {
    "create_registration": {
        "allowed_decisions": ["approve", "edit", "reject", "respond"],
        "description": "创建挂号预约",
    },
    "cancel_registration": {
        "allowed_decisions": ["approve", "edit", "reject", "respond"],
        "description": "取消挂号预约",
    },
    "pay_charge": {
        "allowed_decisions": ["approve", "edit", "reject", "respond"],
        "description": "确认缴费",
    },
    "update_user_profile": {
        "allowed_decisions": ["approve", "edit", "reject", "respond"],
        "description": "修改用户资料",
    },
}


TOOL_DISPLAY: dict[str, dict[str, Any]] = {
    "create_registration": {
        "title": "挂号确认",
        "labels": {
            "patient_id": "患者ID",
            "schedule_id": "排班ID",
        },
    },
    "cancel_registration": {
        "title": "取消挂号确认",
        "labels": {
            "registration_id": "挂号单ID",
        },
    },
    "pay_charge": {
        "title": "缴费确认",
        "labels": {
            "charge_id": "费用ID",
            "pay_type": "支付方式",
            "paid_amount": "支付金额",
        },
    },
    "update_user_profile": {
        "title": "资料修改确认",
        "labels": {
            "user_id": "用户ID",
            "name": "姓名",
            "phone": "手机号",
            "email": "邮箱",
        },
    },
}


def normalize_session_id(session_id: str | None) -> str:
    if session_id is not None:
        clean_session_id = session_id.strip()
        if clean_session_id:
            return clean_session_id

    return uuid.uuid4().hex


def build_hitl_config(session_id: str) -> RunnableConfig:
    return {
        "configurable": {
            "thread_id": session_id,
        }
    }


def format_hitl_decision(data: dict) -> dict:
    decisions = data.get("decisions")
    if isinstance(decisions, list):
        return data

    decision_type = data.get("type")
    if not decision_type:
        decision_type = "approve"

    decision: dict[str, Any] = {
        "type": decision_type,
    }

    if decision_type == "edit":
        edited_action = data.get("edited_action")
        if not isinstance(edited_action, dict):
            edited_action = {}

        tool_name = data.get("tool")
        if not tool_name:
            tool_name = edited_action.get("name", "")

        tool_args = data.get("args")
        if not isinstance(tool_args, dict):
            tool_args = edited_action.get("args", {})

        decision["edited_action"] = {
            "name": tool_name,
            "args": tool_args,
        }

    if decision_type == "reject" or decision_type == "respond":
        message = data.get("message")
        if message:
            decision["message"] = message

    return {
        "decisions": [
            decision,
        ]
    }


def extract_messages_from_result(result) -> list:
    value = getattr(result, "value", None)
    if isinstance(value, dict):
        messages = value.get("messages")
        if messages is not None:
            return messages

    messages = getattr(result, "messages", None)
    if messages is not None:
        return messages

    return []


def extract_interrupt_dicts(result) -> list[dict]:
    raw_interrupts = getattr(result, "interrupts", None)
    if raw_interrupts is None:
        raw_interrupts = []

    items = []
    for item in raw_interrupts:
        if hasattr(item, "value"):
            value = item.value
        else:
            value = item

        if isinstance(value, dict):
            items.append(value)

    return items


def format_interrupts(interrupts: list) -> list:
    formatted = []

    for item in interrupts:
        if not isinstance(item, dict):
            continue

        action_requests = item.get("action_requests", [])
        review_configs = item.get("review_configs", [])
        config_by_action = _index_review_configs(review_configs)

        for action_request in action_requests:
            formatted_action = _format_action_request(action_request, config_by_action)
            formatted.append(formatted_action)

    return formatted


def _index_review_configs(review_configs: list) -> dict:
    config_by_action = {}

    for review_config in review_configs:
        if not isinstance(review_config, dict):
            continue

        action_name = review_config.get("action_name", "")
        if action_name:
            config_by_action[action_name] = review_config

    return config_by_action


def _format_action_request(action_request: dict, config_by_action: dict) -> dict:
    tool_name = action_request.get("name", "")
    tool_args = action_request.get("arguments", {})
    if not tool_args:
        tool_args = action_request.get("args", {})

    description = action_request.get("description", "")
    review = config_by_action.get(tool_name, {})
    allowed_decisions = review.get("allowed_decisions")
    if not allowed_decisions:
        allowed_decisions = ["approve", "edit", "reject", "respond"]

    display = TOOL_DISPLAY.get(tool_name, {})
    title = display.get("title", tool_name)
    labels = display.get("labels", {})

    details = []
    for key, value in tool_args.items():
        label = labels.get(key, key)
        details.append(
            {
                "label": str(label),
                "value": str(value),
            }
        )

    if description:
        summary = description
    else:
        summary = _build_summary(tool_args, labels)

    return {
        "tool": tool_name,
        "args": tool_args,
        "description": description,
        "allowed_decisions": allowed_decisions,
        "title": title,
        "summary": summary,
        "details": details,
    }


def _build_summary(tool_args: dict, labels: dict) -> str:
    parts = []

    for key, value in tool_args.items():
        label = labels.get(key, key)
        parts.append(f"{label}: {value}")

    return " · ".join(parts)
