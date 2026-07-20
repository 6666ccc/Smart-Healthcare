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
    """查询挂号记录列表。

    输入：patient_id、user_id、status 都是可选字符串筛选条件。
    处理：转换成 Java API 的 patientId/userId/status 查询参数，空值不传。
    输出：格式化后的挂号记录摘要文本，供模型直接回复用户。
    """
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
    """查询某个患者的全部挂号记录。

    输入：patient_id 字符串，必须能转换成整数。
    处理：作为 patientId 查询参数调用 GET /api/registrations。
    输出：格式化后的挂号记录摘要文本；参数不是整数时返回中文错误。
    """
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
    """创建挂号预约。

    输入：patient_id 是患者 ID，schedule_id 是排班 ID，二者都来自用户确认后的工具参数。
    处理：转换成整数 JSON body 后调用 POST /api/registrations。
    输出：挂号成功文案或 Java 后端错误文案。

    注意：TOOL_AGENT 配置了 HumanInTheLoopMiddleware，本工具真正执行前会先让前端确认。
    """
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
    """取消指定挂号单。

    输入：registration_id 字符串，来自用户指定的挂号单 ID。
    处理：去掉首尾空格后调用 POST /api/registrations/{id}/cancel。
    输出：取消成功文案或 Java 后端错误文案。
    """
    result = api_call("POST", f"/api/registrations/{registration_id.strip()}/cancel")
    return result if result != "操作成功" else f"挂号单 {registration_id} 已取消"
