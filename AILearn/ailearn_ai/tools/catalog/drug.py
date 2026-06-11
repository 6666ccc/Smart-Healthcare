"""药品字典与库存查询 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def list_drugs(keyword: str | None = None, status: int | None = None) -> str:
    """查询药品列表。可按关键字（药名）、状态筛选，用于了解可开药品及单价。"""
    params: dict = {}
    if keyword:
        params["keyword"] = keyword
    if status is not None:
        params["status"] = status
    return format_result(api_request("GET", "/api/drugs", params=params or None))


@tool
def get_drug(drug_id: int) -> str:
    """根据药品 ID 查询药品详情。"""
    return format_result(api_request("GET", f"/api/drugs/{drug_id}"))


@tool
def list_drug_stocks(low_stock_only: bool = False) -> str:
    """查询药品库存列表。low_stock_only 为 true 时仅返回低库存预警药品。"""
    params: dict = {}
    if low_stock_only:
        params["lowStockOnly"] = "true"
    return format_result(api_request("GET", "/api/drug-stocks", params=params or None))


def get_tools() -> list:
    return [list_drugs, get_drug, list_drug_stocks]
