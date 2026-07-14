"""接诊 Tools。"""

from langchain_core.tools import tool

from wenrun_ai.tools.wenrun_client import api_request, format_result


@tool
def list_visits(status: int | None = None, staff_id: int | None = None) -> str:
    """查询就诊记录列表。可按状态、医生 ID 筛选。"""
    params: dict = {}
    if status is not None:
        params["status"] = status
    if staff_id is not None:
        params["staffId"] = staff_id
    return format_result(api_request("GET", "/api/visits", params=params or None))


@tool
def get_visit(visit_id: int) -> str:
    """根据就诊单 ID 查询接诊详情。"""
    return format_result(api_request("GET", f"/api/visits/{visit_id}"))


@tool
def start_visit(registration_id: int) -> str:
    """根据挂号单 ID 开始接诊，返回 visitId。"""
    return format_result(
        api_request("POST", f"/api/visits/start/{registration_id}")
    )


@tool
def update_visit(
    visit_id: int,
    chief_complaint: str | None = None,
    diagnosis: str | None = None,
    complete: bool = False,
) -> str:
    """录入或更新接诊信息（主诉、诊断）。complete 为 true 时表示完成接诊。"""
    body: dict = {"complete": complete}
    if chief_complaint is not None:
        body["chiefComplaint"] = chief_complaint
    if diagnosis is not None:
        body["diagnosis"] = diagnosis
    return format_result(api_request("PUT", f"/api/visits/{visit_id}", json_body=body))


def get_tools() -> list:
    return [list_visits, get_visit, start_visit, update_visit]
