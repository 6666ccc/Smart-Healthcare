"""科室查询 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def list_departments(status: int | None = None) -> str:
    """查询科室列表。status 可选：启用/停用状态筛选。挂号前用于选择科室。"""
    params: dict = {}
    if status is not None:
        params["status"] = status
    return format_result(api_request("GET", "/api/depts", params=params or None))

@tool
def get_department(dept_id: int) -> str:
    """根据科室 ID 查询科室详情。"""
    return format_result(api_request("GET", f"/api/depts/{dept_id}"))

def get_tools() -> list:
    return [list_departments, get_department]
