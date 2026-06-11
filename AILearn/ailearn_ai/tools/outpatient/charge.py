"""收费 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def list_charges(pay_status: int | None = None, patient_id: int | None = None) -> str:
    """查询收费单列表。可按支付状态、患者 ID 筛选。"""
    params: dict = {}
    if pay_status is not None:
        params["payStatus"] = pay_status
    if patient_id is not None:
        params["patientId"] = patient_id
    return format_result(api_request("GET", "/api/charges", params=params or None))


@tool
def list_pending_charges() -> str:
    """查询待收费列表。"""
    return format_result(api_request("GET", "/api/charges/pending"))


@tool
def get_charge(charge_id: int) -> str:
    """根据收费单 ID 查询详情。"""
    return format_result(api_request("GET", f"/api/charges/{charge_id}"))


@tool
def create_charge_from_visit(visit_id: int) -> str:
    """根据就诊单生成收费单，返回 chargeId。"""
    return format_result(
        api_request("POST", f"/api/charges/from-visit/{visit_id}")
    )


@tool
def pay_charge(charge_id: int, pay_type: int, paid_amount: float) -> str:
    """支付收费单。pay_type 为支付方式编码，paid_amount 为实付金额。"""
    return format_result(
        api_request(
            "POST",
            f"/api/charges/{charge_id}/pay",
            json_body={"payType": pay_type, "paidAmount": paid_amount},
        )
    )


def get_tools() -> list:
    return [
        list_charges,
        list_pending_charges,
        get_charge,
        create_charge_from_visit,
        pay_charge,
    ]
