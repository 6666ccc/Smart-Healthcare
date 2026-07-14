"""处方 Tools。"""

import json

from langchain_core.tools import tool

from wenrun_ai.tools.wenrun_client import api_request, format_result


@tool
def list_prescriptions(visit_id: int) -> str:
    """查询指定就诊单下的处方列表。visit_id 必填。"""
    return format_result(
        api_request("GET", "/api/prescriptions", params={"visitId": visit_id})
    )


@tool
def list_pending_dispense_prescriptions() -> str:
    """查询待发药处方列表。"""
    return format_result(api_request("GET", "/api/prescriptions/pending-dispense"))


@tool
def get_prescription(prescription_id: int) -> str:
    """根据处方 ID 查询处方详情（含药品明细）。"""
    return format_result(api_request("GET", f"/api/prescriptions/{prescription_id}"))


@tool
def create_prescription(visit_id: int, items_json: str) -> str:
    """开具处方。items_json 为药品明细数组 JSON，例如：
    [{"drugId":1,"quantity":2,"usageDesc":"一日三次，饭后服用"}]"""
    try:
        items = json.loads(items_json)
    except json.JSONDecodeError as e:
        return f"items_json 不是合法 JSON: {e}"
    return format_result(
        api_request(
            "POST",
            "/api/prescriptions",
            json_body={"visitId": visit_id, "items": items},
        )
    )


@tool
def cancel_prescription(prescription_id: int) -> str:
    """作废指定处方。"""
    return format_result(
        api_request("POST", f"/api/prescriptions/{prescription_id}/cancel")
    )


def get_tools() -> list:
    return [
        list_prescriptions,
        list_pending_dispense_prescriptions,
        get_prescription,
        create_prescription,
        cancel_prescription,
    ]
