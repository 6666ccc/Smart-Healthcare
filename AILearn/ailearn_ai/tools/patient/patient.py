"""患者建档与查询 Tools。"""

import json

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def search_patients(
    name: str | None = None,
    phone: str | None = None,
    id_card: str | None = None,
) -> str:
    """按姓名、手机号或身份证号查询患者列表。至少提供一个条件。"""
    params: dict = {}
    if name:
        params["name"] = name
    if phone:
        params["phone"] = phone
    if id_card:
        params["idCard"] = id_card
    if not params:
        return "请至少提供 name、phone 或 id_card 之一作为查询条件。"
    return format_result(api_request("GET", "/api/patients", params=params))


@tool
def get_patient(patient_id: int) -> str:
    """根据患者 ID 查询患者档案详情。"""
    return format_result(api_request("GET", f"/api/patients/{patient_id}"))


@tool
def create_patient(patient_json: str) -> str:
    """新建患者档案。patient_json 为 Patient 实体 JSON，例如：
    {"name":"张三","gender":1,"phone":"13800138000","idCard":"..."}"""
    try:
        body = json.loads(patient_json)
    except json.JSONDecodeError as e:
        return f"patient_json 不是合法 JSON: {e}"
    return format_result(api_request("POST", "/api/patients", json_body=body))


def get_tools() -> list:
    return [search_patients, get_patient, create_patient]
