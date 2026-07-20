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
    """查询费用订单列表。

    输入：pay_status 和 patient_id 都是 LangChain tool 传入的字符串，可为空表示不筛选。
    处理：把可选字符串转成 Java API 需要的 payStatus/patientId 查询参数。
    输出：格式化后的费用订单摘要文本，供模型直接回复用户。
    """
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
    """查询当前登录患者的待支付费用。

    输入：无显式参数，患者身份来自本次请求注入的 access_token。
    处理：调用 Java 后端 GET /api/charges/pending。
    输出：格式化后的待支付费用列表文本。
    """
    raw = api_call("GET", "/api/charges/pending")
    return format_charges(raw)


@tool("get_charge_detail", description="获取费用订单详情（含明细项）")
def get_charge_detail(charge_id: str) -> str:
    """查询单个费用订单详情。

    输入：charge_id 字符串，来自用户指定的费用订单 ID。
    处理：去掉首尾空格后拼进 GET /api/charges/{id}。
    输出：Java 后端返回的订单详情 JSON 字符串或错误文案。
    """
    return api_call("GET", f"/api/charges/{charge_id.strip()}")


@tool(
    "pay_charge",
    description="确认支付费用订单；pay_type 必填（如 1微信 2支付宝 3现金），paid_amount 可选",
)
def pay_charge(charge_id: str, pay_type: str, paid_amount: str = "") -> str:
    """支付指定费用订单。

    输入：charge_id 是费用订单 ID；pay_type 是支付方式数字；paid_amount 可选。
    处理：把字符串参数转换成 Java API 需要的 JSON body，再 POST 到支付接口。
    输出：支付成功文案，或 Java 后端/参数校验返回的错误文案。
    """
    try:
        body: dict[str, Any] = {"payType": int(pay_type.strip())}
        if paid_amount.strip():
            body["paidAmount"] = float(paid_amount.strip())
    except ValueError:
        return "支付失败：pay_type 必须是整数，paid_amount 必须是数字"

    result = api_call("POST", f"/api/charges/{charge_id.strip()}/pay", json_body=body)
    return result if result != "操作成功" else f"订单 {charge_id} 支付成功"
