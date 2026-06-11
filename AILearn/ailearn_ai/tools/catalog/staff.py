"""医护人员查询 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def list_staff(dept_id: int | None = None, status: int | None = None) -> str:
    """查询医护人员列表。可按科室 ID、在职状态筛选，用于查找医生信息。"""
    params: dict = {}
    if dept_id is not None:
        params["deptId"] = dept_id
    if status is not None:
        params["status"] = status
    return format_result(api_request("GET", "/api/staff", params=params or None))


@tool
def get_staff(staff_id: int) -> str:
    """根据员工 ID 查询医护人员详情（含科室、职称等）。"""
    return format_result(api_request("GET", f"/api/staff/{staff_id}"))


def get_tools() -> list:
    return [list_staff, get_staff]
