"""科室、医生、排班查询 — 患者挂号前的浏览类工具。"""

from __future__ import annotations

from langchain.tools import tool

from app.tools.client import api_call, build_params, format_schedules, parse_optional_int


@tool("list_departments", description="获取医院科室列表，可按 status 筛选（1启用 0停用）")
def list_departments(status: str = "") -> str:
    """查询医院科室列表。

    输入：status 字符串，可为空；非空时应是 Java 后端识别的状态数字。
    处理：转换成 status 查询参数后调用 GET /api/depts。
    输出：Java 后端返回的科室列表 JSON 字符串或错误文案。
    """
    try:
        params = build_params(status=parse_optional_int(status, "status"))
    except ValueError as exc:
        return str(exc)

    return api_call("GET", "/api/depts", params=params or None)


@tool("get_department_detail", description="获取科室详情，需传入 dept_id")
def get_department_detail(dept_id: str) -> str:
    """查询单个科室详情。

    输入：dept_id 字符串，来自用户指定的科室 ID。
    处理：去掉首尾空格后拼进 GET /api/depts/{id}。
    输出：科室详情 JSON 字符串或错误文案。
    """
    return api_call("GET", f"/api/depts/{dept_id.strip()}")


@tool("list_doctors", description="查询医生列表，可按 dept_id、status 筛选")
def list_doctors(dept_id: str = "", status: str = "") -> str:
    """查询医生列表。

    输入：dept_id 和 status 都是可选字符串筛选条件。
    处理：转换成 Java API 的 deptId/status 查询参数，空值不传。
    输出：Java 后端返回的医生列表 JSON 字符串或错误文案。
    """
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
    """查询单个医生详情。

    输入：staff_id 字符串，来自用户指定的医生 ID。
    处理：去掉首尾空格后调用 GET /api/staff/{id}。
    输出：医生详情 JSON 字符串或错误文案。
    """
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
    """查询医生排班和剩余号源。

    输入：dept_id、work_date、staff_id 都是可选字符串筛选条件。
    处理：把科室和医生 ID 转成整数参数，work_date 原样传给 Java API。
    输出：格式化后的排班列表文本，方便用户选择 schedule_id 挂号。
    """
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
    """查询单个排班详情。

    输入：schedule_id 字符串，通常来自 list_schedules 的排班 ID。
    处理：去掉首尾空格后调用 GET /api/schedules/{id}。
    输出：排班详情 JSON 字符串，供挂号前核对医生、日期、号源和费用。
    """
    return api_call("GET", f"/api/schedules/{schedule_id.strip()}")
