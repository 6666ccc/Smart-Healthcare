"""挂号预约：查询、创建、取消。"""

from __future__ import annotations

from langchain.tools import tool

from app.tools.client import (
    api_call,
    build_params,
    format_registrations,
    parse_optional_int,
)


@tool(
    "list_registrations",
    description="查询挂号记录，可按 patient_id、user_id、status(1已挂号/2已就诊/3已退号) 筛选",
)
def list_registrations(
    patient_id: str = "",
    user_id: str = "",
    status: str = "",
) -> str:
    """GET /api/registrations"""
    try:
        params = build_params(
            patientId=parse_optional_int(patient_id, "patient_id"),
            userId=parse_optional_int(user_id, "user_id"),
            status=parse_optional_int(status, "status"),
        )
    except ValueError as exc:
        return str(exc)

    raw = api_call("GET", "/api/registrations", params=params or None)
    return format_registrations(raw)


@tool("get_patient_registration_records", description="通过患者 ID 获取该患者的全部挂号记录")
def get_patient_registration_records(patient_id: str) -> str:
    """GET /api/registrations?patientId=xxx"""
    try:
        params = {"patientId": int(patient_id.strip())}
    except ValueError:
        return "查询失败：patient_id 必须是整数"

    raw = api_call("GET", "/api/registrations", params=params)
    return format_registrations(raw)


@tool(
    "create_registration",
    description="创建挂号预约，需传入 patient_id 与 schedule_id；调用前应先通过 get_schedule_detail 核对排班信息",
)
def create_registration(patient_id: str, schedule_id: str) -> str:
    """POST /api/registrations"""
    try:
        body = {
            "patientId": int(patient_id.strip()),
            "scheduleId": int(schedule_id.strip()),
        }
    except ValueError:
        return "创建失败：patient_id 与 schedule_id 必须是整数"

    result = api_call("POST", "/api/registrations", json_body=body)
    if result.isdigit():
        return f"挂号成功，挂号单 ID：{result}"
    return result


@tool("cancel_registration", description="取消指定挂号单（仅未就诊的挂号可取消）")
def cancel_registration(registration_id: str) -> str:
    """POST /api/registrations/{id}/cancel"""
    result = api_call("POST", f"/api/registrations/{registration_id.strip()}/cancel")
    return result if result != "操作成功" else f"挂号单 {registration_id} 已取消"
