"""挂号 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def list_registrations(patient_id: int | None = None, status: int | None = None) -> str:
    """查询挂号记录列表。可按患者 ID、挂号状态筛选。"""
    params: dict = {}
    if patient_id is not None:
        params["patientId"] = patient_id
    if status is not None:
        params["status"] = status
    return format_result(api_request("GET", "/api/registrations", params=params or None))


@tool
def list_pending_registrations() -> str:
    """查询待诊挂号列表（已挂号、尚未接诊）。"""
    return format_result(api_request("GET", "/api/registrations/pending"))


@tool
def create_registration(patient_id: int, schedule_id: int) -> str:
    """为患者办理挂号。需提供患者 ID 与排班 ID（可先查排班获取 schedule_id）。"""
    return format_result(
        api_request(
            "POST",
            "/api/registrations",
            json_body={"patientId": patient_id, "scheduleId": schedule_id},
        )
    )


@tool
def cancel_registration(registration_id: int) -> str:
    """取消指定挂号单。"""
    return format_result(
        api_request("POST", f"/api/registrations/{registration_id}/cancel")
    )


def get_tools() -> list:
    return [
        list_registrations,
        list_pending_registrations,
        create_registration,
        cancel_registration,
    ]
