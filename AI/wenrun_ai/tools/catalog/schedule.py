"""排班查询 Tools。"""

from langchain_core.tools import tool

from wenrun_ai.tools.wenrun_client import api_request, format_result


@tool
def list_schedules(
    dept_id: int | None = None,
    work_date: str | None = None,
    staff_id: int | None = None,
) -> str:
    """查询医生排班列表。可按科室 ID、出诊日期(ISO 如 2026-05-23)、医生 ID 筛选。
    用于挂号前查看可预约时段与值班医生。"""
    params: dict = {}
    if dept_id is not None:
        params["deptId"] = dept_id
    if work_date:
        params["workDate"] = work_date
    if staff_id is not None:
        params["staffId"] = staff_id
    return format_result(api_request("GET", "/api/schedules", params=params or None))


@tool
def get_schedule(schedule_id: int) -> str:
    """根据排班 ID 查询排班详情（科室、医生、日期、剩余号源等）。"""
    return format_result(api_request("GET", f"/api/schedules/{schedule_id}"))


@tool
def get_on_duty_doctors(dept_id: int, work_date: str | None = None) -> str:
    """获取指定科室在指定日期的值班/出诊医生排班。work_date 默认为当天，格式 ISO 日期如 2026-05-23。"""
    params: dict = {"deptId": dept_id}
    if work_date:
        params["workDate"] = work_date
    return format_result(api_request("GET", "/api/schedules", params=params))


def get_tools() -> list:
    return [list_schedules, get_schedule, get_on_duty_doctors]
