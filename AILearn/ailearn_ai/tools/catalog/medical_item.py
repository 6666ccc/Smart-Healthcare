"""医疗项目（检查/治疗价目）查询 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def list_medical_items(item_type: int | None = None, status: int | None = None) -> str:
    """查询医疗项目价目表。可按项目类型、启用状态筛选，用于了解检查/治疗项目及价格。"""
    params: dict = {}
    if item_type is not None:
        params["itemType"] = item_type
    if status is not None:
        params["status"] = status
    return format_result(api_request("GET", "/api/medical-items", params=params or None))


@tool
def get_medical_item(item_id: int) -> str:
    """根据项目 ID 查询医疗项目详情。"""
    return format_result(api_request("GET", f"/api/medical-items/{item_id}"))


def get_tools() -> list:
    return [list_medical_items, get_medical_item]
