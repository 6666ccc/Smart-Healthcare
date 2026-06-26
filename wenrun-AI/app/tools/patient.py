"""
患者端 AI 工具 — 封装对 Java 后端患者门户 API 的调用。

说明：
- 仅暴露患者助手需要的业务能力（查询、挂号、缴费、就诊记录等）
- 登录/注册/登出/Token 刷新由前端或 Java 层处理，不在此暴露给 Agent
- access_token 由上层在对话前通过 set_patient_token() 注入，Agent 无需感知
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx
from langchain.tools import tool

from app.core.config import Config
from app.services.auth import api_key_headers

# 由 Java / 路由层在发起 Agent 前注入当前患者 Token
_patient_access_token: str | None = None

_REG_STATUS = {1: "已挂号", 2: "已就诊", 3: "已退号"}
_PAY_STATUS = {0: "待支付", 1: "已支付", 2: "已退款"}
_VISIT_STATUS = {1: "进行中", 2: "已完成"}


# ---------------------------------------------------------------------------
# 内部辅助
# ---------------------------------------------------------------------------

def set_patient_token(access_token: str | None) -> None:
    """供上层注入当前患者 access_token（非 Agent 工具）。"""
    global _patient_access_token
    _patient_access_token = access_token.strip() if access_token else None


def _run_async(coro):
    import concurrent.futures

    def _runner():
        return asyncio.run(coro)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(_runner).result()


def _resolve_access_token() -> str:
    token = (_patient_access_token or "").strip()
    if not token:
        raise ValueError("患者未登录，无法调用业务接口")
    return token


def _auth_headers(access_token: str) -> dict[str, str]:
    """构建请求头：用户 JWT 用于身份识别，API Key 用于服务认证。"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    headers.update(api_key_headers())  # 追加 X-API-Key
    return headers


def _format_api_result(body: Any) -> str:
    if not isinstance(body, dict):
        return json.dumps(body, ensure_ascii=False, indent=2)

    code = body.get("code")
    message = body.get("message", "")
    data = body.get("data")

    if code not in (None, 200, 0):
        return f"请求失败（code={code}）：{message or '未知错误'}"

    if data is None:
        return message or "操作成功"

    return json.dumps(data, ensure_ascii=False, indent=2)


def _build_params(**kwargs: Any) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for key, value in kwargs.items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        params[key] = value
    return params


def _parse_optional_int(value: str, field_name: str) -> int | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError as exc:
        raise ValueError(f"{field_name} 必须是整数") from exc


def _api_call(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> str:
    async def _call() -> str:
        token = _resolve_access_token()
        url = f"{Config.JAVA_BASE_URL}{path}"
        async with httpx.AsyncClient(timeout=Config.REQUEST_TIMEOUT) as client:
            resp = await client.request(
                method,
                url,
                headers=_auth_headers(token),
                params=params,
                json=json_body,
            )
            resp.raise_for_status()
            if not resp.content:
                return "操作成功"
            return _format_api_result(resp.json())

    try:
        return _run_async(_call())
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text.strip()
        return f"HTTP {exc.response.status_code} 错误：{detail or exc}"
    except Exception as exc:
        return f"调用失败：{exc}"


def _format_registrations(raw: str) -> str:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw

    if not isinstance(data, list):
        return raw
    if not data:
        return "当前没有挂号记录。"

    lines = [f"共 {len(data)} 条挂号记录："]
    for item in data:
        status_code = item.get("status")
        status_text = _REG_STATUS.get(status_code, status_code)
        lines.append(
            f"  · 挂号ID: {item.get('id')}"
            f" | 患者: {item.get('patientName')}"
            f" | 科室: {item.get('deptName') or item.get('departmentName')}"
            f" | 医生: {item.get('staffName') or item.get('doctorName')}"
            f" | 时间: {item.get('regTime') or item.get('appointmentTime')}"
            f" | 状态: {status_text}"
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 患者信息
# ---------------------------------------------------------------------------

@tool("get_patient_detail", description="根据患者 ID 获取患者档案详情")
def get_patient_detail(patient_id: str) -> str:
    """GET /api/patients/{id}"""
    return _api_call("GET", f"/api/patients/{patient_id.strip()}")


@tool("update_user_profile", description="更新当前登录患者个人信息（姓名、电话、性别、出生日期、身份证、住址、过敏史）")
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
        body["gender"] = _parse_optional_int(gender, "gender")
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
        return _api_call("PUT", "/api/user/profile", json_body=body)
    except ValueError as exc:
        return str(exc)


# ---------------------------------------------------------------------------
# 挂号预约
# ---------------------------------------------------------------------------

@tool("list_registrations", description="查询挂号记录，可按 patient_id、user_id、status(1已挂号/2已就诊/3已退号) 筛选")
def list_registrations(
    patient_id: str = "",
    user_id: str = "",
    status: str = "",
) -> str:
    """GET /api/registrations"""
    try:
        params = _build_params(
            patientId=_parse_optional_int(patient_id, "patient_id"),
            userId=_parse_optional_int(user_id, "user_id"),
            status=_parse_optional_int(status, "status"),
        )
    except ValueError as exc:
        return str(exc)

    raw = _api_call("GET", "/api/registrations", params=params or None)
    return _format_registrations(raw)


@tool("get_patient_registration_records", description="通过患者 ID 获取该患者的挂号记录列表")
def get_patient_registration_records(patient_id: str) -> str:
    """GET /api/registrations?patientId=xxx"""
    try:
        params = {"patientId": int(patient_id.strip())}
    except ValueError:
        return "查询失败：patient_id 必须是整数"

    raw = _api_call("GET", "/api/registrations", params=params)
    return _format_registrations(raw)


@tool("create_registration", description="创建挂号预约，需传入 patient_id 与 schedule_id")
def create_registration(patient_id: str, schedule_id: str) -> str:
    """POST /api/registrations"""
    try:
        body = {
            "patientId": int(patient_id.strip()),
            "scheduleId": int(schedule_id.strip()),
        }
    except ValueError:
        return "创建失败：patient_id 与 schedule_id 必须是整数"

    result = _api_call("POST", "/api/registrations", json_body=body)
    if result.isdigit():
        return f"挂号成功，挂号单 ID：{result}"
    return result


@tool("cancel_registration", description="取消指定挂号单")
def cancel_registration(registration_id: str) -> str:
    """POST /api/registrations/{id}/cancel"""
    result = _api_call("POST", f"/api/registrations/{registration_id.strip()}/cancel")
    return result if result != "操作成功" else f"挂号单 {registration_id} 已取消"


# ---------------------------------------------------------------------------
# 科室 & 医生
# ---------------------------------------------------------------------------

@tool("list_departments", description="获取医院科室列表，可按 status 筛选（1启用 0停用）")
def list_departments(status: str = "") -> str:
    """GET /api/depts"""
    try:
        params = _build_params(status=_parse_optional_int(status, "status"))
    except ValueError as exc:
        return str(exc)

    return _api_call("GET", "/api/depts", params=params or None)


@tool("list_schedules", description="查询医生排班，可按 dept_id、work_date(YYYY-MM-DD)、staff_id 筛选")
def list_schedules(
    dept_id: str = "",
    work_date: str = "",
    staff_id: str = "",
) -> str:
    """GET /api/schedules"""
    try:
        params = _build_params(
            deptId=_parse_optional_int(dept_id, "dept_id"),
            workDate=work_date.strip() or None,
            staffId=_parse_optional_int(staff_id, "staff_id"),
        )
    except ValueError as exc:
        return str(exc)

    return _api_call("GET", "/api/schedules", params=params or None)


@tool("list_doctors", description="查询医生列表，可按 dept_id、status 筛选")
def list_doctors(dept_id: str = "", status: str = "") -> str:
    """GET /api/staff"""
    try:
        params = _build_params(
            deptId=_parse_optional_int(dept_id, "dept_id"),
            status=_parse_optional_int(status, "status"),
        )
    except ValueError as exc:
        return str(exc)

    return _api_call("GET", "/api/staff", params=params or None)


# ---------------------------------------------------------------------------
# 费用 & 支付
# ---------------------------------------------------------------------------

@tool("list_charges", description="查询费用订单，可按 pay_status(0待支付/1已支付) 与 patient_id 筛选")
def list_charges(pay_status: str = "", patient_id: str = "") -> str:
    """GET /api/charges"""
    try:
        params = _build_params(
            payStatus=_parse_optional_int(pay_status, "pay_status"),
            patientId=_parse_optional_int(patient_id, "patient_id"),
        )
    except ValueError as exc:
        return str(exc)

    raw = _api_call("GET", "/api/charges", params=params or None)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw

    if not isinstance(data, list):
        return raw
    if not data:
        return "当前没有费用订单。"

    lines = [f"共 {len(data)} 条费用订单："]
    for item in data:
        status_code = item.get("payStatus")
        status_text = _PAY_STATUS.get(status_code, status_code)
        lines.append(
            f"  · 订单ID: {item.get('id')}"
            f" | 单号: {item.get('orderNo')}"
            f" | 金额: {item.get('totalAmount')}"
            f" | 状态: {status_text}"
        )
    return "\n".join(lines)


@tool("get_charge_detail", description="获取费用订单详情")
def get_charge_detail(charge_id: str) -> str:
    """GET /api/charges/{id}"""
    return _api_call("GET", f"/api/charges/{charge_id.strip()}")


@tool("pay_charge", description="确认支付费用订单；pay_type 必填，paid_amount 可选")
def pay_charge(charge_id: str, pay_type: str, paid_amount: str = "") -> str:
    """POST /api/charges/{id}/pay"""
    try:
        body: dict[str, Any] = {"payType": int(pay_type.strip())}
        if paid_amount.strip():
            body["paidAmount"] = float(paid_amount.strip())
    except ValueError:
        return "支付失败：pay_type 必须是整数，paid_amount 必须是数字"

    result = _api_call("POST", f"/api/charges/{charge_id.strip()}/pay", json_body=body)
    return result if result != "操作成功" else f"订单 {charge_id} 支付成功"


# ---------------------------------------------------------------------------
# 就诊 & 处方 & 检查
# ---------------------------------------------------------------------------

@tool("list_visits", description="查询就诊记录，可按 status(1进行中/2已完成) 与 staff_id 筛选")
def list_visits(status: str = "", staff_id: str = "") -> str:
    """GET /api/visits"""
    try:
        params = _build_params(
            status=_parse_optional_int(status, "status"),
            staffId=_parse_optional_int(staff_id, "staff_id"),
        )
    except ValueError as exc:
        return str(exc)

    raw = _api_call("GET", "/api/visits", params=params or None)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw

    if not isinstance(data, list):
        return raw
    if not data:
        return "当前没有就诊记录。"

    lines = [f"共 {len(data)} 条就诊记录："]
    for item in data:
        status_code = item.get("status")
        status_text = _VISIT_STATUS.get(status_code, status_code)
        lines.append(
            f"  · 就诊ID: {item.get('id')}"
            f" | 患者: {item.get('patientName')}"
            f" | 医生: {item.get('staffName')}"
            f" | 诊断: {item.get('diagnosis')}"
            f" | 状态: {status_text}"
        )
    return "\n".join(lines)


@tool("list_prescriptions_by_visit", description="按 visit_id 查询处方列表")
def list_prescriptions_by_visit(visit_id: str) -> str:
    """GET /api/prescriptions?visitId=xxx"""
    return _api_call("GET", "/api/prescriptions", params={"visitId": visit_id.strip()})


@tool("list_exam_requests_by_visit", description="按 visit_id 查询检查申请列表")
def list_exam_requests_by_visit(visit_id: str) -> str:
    """GET /api/exam-requests?visitId=xxx"""
    return _api_call("GET", "/api/exam-requests", params={"visitId": visit_id.strip()})


# ---------------------------------------------------------------------------
# 工具导出（仅 Agent 可用）
# ---------------------------------------------------------------------------

PATIENT_ALL_TOOLS = [
    get_patient_detail,
    update_user_profile,
    list_registrations,
    get_patient_registration_records,
    create_registration,
    cancel_registration,
    list_departments,
    list_schedules,
    list_doctors,
    list_charges,
    get_charge_detail,
    pay_charge,
    list_visits,
    list_prescriptions_by_visit,
    list_exam_requests_by_visit,
]

__all__ = ["PATIENT_ALL_TOOLS", "set_patient_token"]
