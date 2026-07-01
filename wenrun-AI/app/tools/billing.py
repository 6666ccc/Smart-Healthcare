"""费用查询与支付 — 患者端账单工具。"""

from __future__ import annotations

from typing import Any

from langchain.tools import tool

from app.tools.client import api_call, build_params, format_charges, parse_optional_int


@tool(
    "list_charges",
    description="查询费用订单，可按 pay_status(0待支付/1已支付/2已退款) 与 patient_id 筛选",
)
def list_charges(pay_status: str = "", patient_id: str = "") -> str:
    """GET /api/charges"""
    try:
        params = build_params(
            payStatus=parse_optional_int(pay_status, "pay_status"),
            patientId=parse_optional_int(patient_id, "patient_id"),
        )
    except ValueError as exc:
        return str(exc)

    raw = api_call("GET", "/api/charges", params=params or None)
    return format_charges(raw)


@tool("list_pending_charges", description="查询待支付费用订单列表")
def list_pending_charges() -> str:
    """GET /api/charges/pending"""
    raw = api_call("GET", "/api/charges/pending")
    return format_charges(raw)


@tool("get_charge_detail", description="获取费用订单详情（含明细项）")
def get_charge_detail(charge_id: str) -> str:
    """GET /api/charges/{id}"""
    return api_call("GET", f"/api/charges/{charge_id.strip()}")


@tool(
    "pay_charge",
    description="确认支付费用订单；pay_type 必填（如 1微信 2支付宝 3现金），paid_amount 可选",
)
def pay_charge(charge_id: str, pay_type: str, paid_amount: str = "") -> str:
    """POST /api/charges/{id}/pay"""
    try:
        body: dict[str, Any] = {"payType": int(pay_type.strip())}
        if paid_amount.strip():
            body["paidAmount"] = float(paid_amount.strip())
    except ValueError:
        return "支付失败：pay_type 必须是整数，paid_amount 必须是数字"

    result = api_call("POST", f"/api/charges/{charge_id.strip()}/pay", json_body=body)
    return result if result != "操作成功" else f"订单 {charge_id} 支付成功"
