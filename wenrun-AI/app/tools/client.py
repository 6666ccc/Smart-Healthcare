"""Java 后端 HTTP 客户端与通用格式化，供患者端 LangChain 工具复用。"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx

from app.core.config import Config
from app.integrations.java_auth import api_key_headers

_patient_access_token: str | None = None

REG_STATUS = {1: "已挂号", 2: "已就诊", 3: "已退号"}
PAY_STATUS = {0: "待支付", 1: "已支付", 2: "已退款"}
VISIT_STATUS = {1: "进行中", 2: "已完成"}


def set_patient_token(access_token: str | None) -> None:
    """注入当前患者 access_token（由 /java/chat 入口在请求生命周期内设置）。"""
    global _patient_access_token
    _patient_access_token = access_token.strip() if access_token else None


def _run_async(coro):
    import concurrent.futures

    def _runner():
        return asyncio.run(coro)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(_runner).result()


def resolve_access_token() -> str:
    token = (_patient_access_token or "").strip()
    if not token:
        raise ValueError("患者未登录，无法调用业务接口")
    return token


def auth_headers(access_token: str) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    headers.update(api_key_headers())
    return headers


def format_api_result(body: Any) -> str:
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


def build_params(**kwargs: Any) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for key, value in kwargs.items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        params[key] = value
    return params


def parse_optional_int(value: str, field_name: str) -> int | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError as exc:
        raise ValueError(f"{field_name} 必须是整数") from exc


def api_call(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> str:
    async def _call() -> str:
        token = resolve_access_token()
        url = f"{Config.JAVA_BASE_URL}{path}"
        async with httpx.AsyncClient(timeout=Config.REQUEST_TIMEOUT) as client:
            resp = await client.request(
                method,
                url,
                headers=auth_headers(token),
                params=params,
                json=json_body,
            )
            resp.raise_for_status()
            if not resp.content:
                return "操作成功"
            return format_api_result(resp.json())

    try:
        return _run_async(_call())
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text.strip()
        return f"HTTP {exc.response.status_code} 错误：{detail or exc}"
    except Exception as exc:
        return f"调用失败：{exc}"


def format_registrations(raw: str) -> str:
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
        status_text = REG_STATUS.get(status_code, status_code)
        lines.append(
            f"  · 挂号ID: {item.get('id')}"
            f" | 患者: {item.get('patientName')}"
            f" | 科室: {item.get('deptName') or item.get('departmentName')}"
            f" | 医生: {item.get('staffName') or item.get('doctorName')}"
            f" | 日期: {item.get('workDate')}"
            f" | 时段: {item.get('timePeriod')}"
            f" | 时间: {item.get('regTime') or item.get('appointmentTime')}"
            f" | 状态: {status_text}"
        )
    return "\n".join(lines)


def format_charges(raw: str) -> str:
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
        status_text = PAY_STATUS.get(status_code, status_code)
        lines.append(
            f"  · 订单ID: {item.get('id')}"
            f" | 单号: {item.get('orderNo')}"
            f" | 金额: {item.get('totalAmount')}"
            f" | 状态: {status_text}"
        )
    return "\n".join(lines)


def format_schedules(raw: str) -> str:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw

    if not isinstance(data, list):
        return raw
    if not data:
        return "未找到符合条件的排班。"

    lines = [f"共 {len(data)} 条排班："]
    for item in data:
        lines.append(
            f"  · 排班ID: {item.get('id')}"
            f" | 科室: {item.get('deptName')}"
            f" | 医生: {item.get('staffName')}"
            f" | 日期: {item.get('workDate')}"
            f" | 时段: {item.get('timePeriod')}"
            f" | 剩余号源: {item.get('remainingCount')}/{item.get('totalCount')}"
            f" | 挂号费: {item.get('registerFee')}"
        )
    return "\n".join(lines)
