"""挂号 Tools。"""

from langchain_core.tools import tool

from wenrun_ai.tools.wenrun_client import api_request, format_result


@tool
def list_registrations(
    patient_id: int | None = None,
    user_id: int | None = None,
    status: int | None = None,
) -> str:
    """查询挂号记录列表。可按患者 ID、用户 ID（查该用户自己的+帮别人挂的）、挂号状态筛选。

    user_id 参数说明：传当前登录用户的 sys_user.id，后端会使用 OR 查询：
    (patient.user_id = user_id) OR (registration.registrant_user_id = user_id)，
    一次查询同时返回"自己的挂号记录"和"帮别人（如子女）挂的号"。
    """
    params: dict = {}
    if patient_id is not None:
        params["patientId"] = patient_id
    if user_id is not None:
        params["userId"] = user_id
    if status is not None:
        params["status"] = status
    return format_result(api_request("GET", "/api/registrations", params=params or None))


@tool
def list_pending_registrations() -> str:
    """查询待诊挂号列表（已挂号、尚未接诊）。"""
    return format_result(api_request("GET", "/api/registrations/pending"))


@tool
def create_registration(patient_id: int, schedule_id: int) -> str:
    """为患者办理挂号。需提供患者 ID 与排班 ID（可先查排班获取 schedule_id）。

    挂号人的用户 ID（registrant_user_id）由后端根据 X-User-Id 请求头自动填入，
    用于后续查询时区分"自己挂的号"和"帮别人挂的号"（如家长给子女挂号）。
    """
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
