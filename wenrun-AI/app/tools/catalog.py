"""科室、医生、排班查询 — 患者挂号前的浏览类工具。"""

from __future__ import annotations

from langchain.tools import tool

from app.tools.client import api_call, build_params, format_schedules, parse_optional_int


@tool("list_departments", description="获取医院科室列表，可按 status 筛选（1启用 0停用）")
def list_departments(status: str = "") -> str:
    """GET /api/depts"""
    try:
        params = build_params(status=parse_optional_int(status, "status"))
    except ValueError as exc:
        return str(exc)

    return api_call("GET", "/api/depts", params=params or None)


@tool("get_department_detail", description="获取科室详情，需传入 dept_id")
def get_department_detail(dept_id: str) -> str:
    """GET /api/depts/{id}"""
    return api_call("GET", f"/api/depts/{dept_id.strip()}")


@tool("list_doctors", description="查询医生列表，可按 dept_id、status 筛选")
def list_doctors(dept_id: str = "", status: str = "") -> str:
    """GET /api/staff"""
    try:
        params = build_params(
            deptId=parse_optional_int(dept_id, "dept_id"),
            status=parse_optional_int(status, "status"),
        )
    except ValueError as exc:
        return str(exc)

    return api_call("GET", "/api/staff", params=params or None)


@tool("get_doctor_detail", description="获取医生详情，需传入 staff_id")
def get_doctor_detail(staff_id: str) -> str:
    """GET /api/staff/{id}"""
    return api_call("GET", f"/api/staff/{staff_id.strip()}")


@tool(
    "list_schedules",
    description="查询医生排班与剩余号源，可按 dept_id、work_date(YYYY-MM-DD)、staff_id 筛选",
)
def list_schedules(
    dept_id: str = "",
    work_date: str = "",
    staff_id: str = "",
) -> str:
    """GET /api/schedules"""
    try:
        params = build_params(
            deptId=parse_optional_int(dept_id, "dept_id"),
            workDate=work_date.strip() or None,
            staffId=parse_optional_int(staff_id, "staff_id"),
        )
    except ValueError as exc:
        return str(exc)

    raw = api_call("GET", "/api/schedules", params=params or None)
    return format_schedules(raw)


@tool("get_schedule_detail", description="获取排班详情（号源、挂号费等），挂号前确认用")
def get_schedule_detail(schedule_id: str) -> str:
    """GET /api/schedules/{id}"""
    return api_call("GET", f"/api/schedules/{schedule_id.strip()}")
