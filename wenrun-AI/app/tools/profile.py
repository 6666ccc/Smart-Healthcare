"""患者档案与个人资料工具。"""

from __future__ import annotations

from typing import Any

from langchain.tools import tool

from app.tools.client import api_call, parse_optional_int


@tool("get_patient_detail", description="根据患者 ID 获取患者档案详情（姓名、性别、过敏史等）")
def get_patient_detail(patient_id: str) -> str:
    """GET /api/patients/{id}"""
    return api_call("GET", f"/api/patients/{patient_id.strip()}")


@tool(
    "update_user_profile",
    description="更新当前登录患者个人信息（真实姓名、电话、性别、出生日期、身份证、住址、过敏史）",
)
def update_user_profile(
    real_name: str = "",
    phone: str = "",
    gender: str = "",
    birth_date: str = "",
    id_card: str = "",
    address: str = "",
    allergy_history: str = "",
) -> str:
    """PUT /api/user/profile"""
    body: dict[str, Any] = {}
    if real_name.strip():
        body["realName"] = real_name.strip()
    if phone.strip():
        body["phone"] = phone.strip()
    if gender.strip():
        body["gender"] = parse_optional_int(gender, "gender")
    if birth_date.strip():
        body["birthDate"] = birth_date.strip()
    if id_card.strip():
        body["idCard"] = id_card.strip()
    if address.strip():
        body["address"] = address.strip()
    if allergy_history.strip():
        body["allergyHistory"] = allergy_history.strip()

    if not body:
        return "更新失败：请至少提供一个要更新的字段"

    try:
        return api_call("PUT", "/api/user/profile", json_body=body)
    except ValueError as exc:
        return str(exc)
