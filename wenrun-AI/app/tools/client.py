"""Java 后端 HTTP 客户端与通用格式化，供患者端 LangChain 工具复用。"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx

from app.core.config import Config
from app.integrations.java_auth import api_key_headers

# 当前请求的患者 token。
# 输入来源：/java/chat 或 /java/chat/resume 入口调用 set_patient_token。
# 使用位置：api_call -> resolve_access_token -> auth_headers。
# 注意：这是模块级变量，路由层必须在 finally 中清理，避免影响下一次请求。
_patient_access_token: str | None = None

# Java 后端返回的数字状态码 -> 给用户看的中文状态。
REG_STATUS = {1: "已挂号", 2: "已就诊", 3: "已退号"}
PAY_STATUS = {0: "待支付", 1: "已支付", 2: "已退款"}
VISIT_STATUS = {1: "进行中", 2: "已完成"}


def set_patient_token(access_token: str | None) -> None:
    """注入当前患者 access_token。

    输入：从 JavaChatRequest.extra 或 HTTP header 中提取出的 token，也可能是 None。
    处理：去掉首尾空格后写入模块级变量 _patient_access_token。
    输出：无返回值；后续 api_call 会用这个 token 组装 Authorization header。
    """
    global _patient_access_token
    _patient_access_token = access_token.strip() if access_token else None


def _run_async(coro):
    """在同步 LangChain tool 函数里运行异步 HTTP 协程。

    输入：httpx 异步请求协程。
    处理：新建一个线程执行 asyncio.run，避免当前环境已有事件循环时直接 run 报错。
    输出：协程的返回值，通常是 Java API 格式化后的字符串。
    """
    import concurrent.futures

    def _runner():
        return asyncio.run(coro)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(_runner).result()


def resolve_access_token() -> str:
    """读取当前请求注入的患者 token。

    输入：模块级变量 _patient_access_token。
    处理：去掉空白；为空时抛出 ValueError，阻止工具在未登录状态调用 Java 业务接口。
    输出：可放入 Authorization header 的 token 字符串。
    """
    token = (_patient_access_token or "").strip()
    if not token:
        raise ValueError("患者未登录，无法调用业务接口")
    return token


def auth_headers(access_token: str) -> dict[str, str]:
    """组装调用 Java 后端需要的 HTTP 请求头。

    输入：患者 access_token。
    处理：生成 Bearer token 和 JSON Content-Type，并合并 Java 网关需要的 api_key_headers。
    输出：httpx 可直接使用的 headers dict。
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    headers.update(api_key_headers())
    return headers


def format_api_result(body: Any) -> str:
    """把 Java 后端统一响应体转换成适合模型和用户阅读的字符串。

    输入：resp.json() 的结果，通常是 {"code": 200, "message": "...", "data": ...}。
    处理：非 dict 直接格式化；失败 code 返回错误文案；成功时优先展示 data。
    输出：中文提示或 pretty JSON 字符串，作为 LangChain tool 的返回值。
    """
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
    """过滤 GET 查询参数中的空值。

    输入：工具函数传入的关键字参数，例如 patientId=None、status=""。
    处理：丢弃 None 和空字符串，保留 0 这类有效值。
    输出：可传给 httpx params 的 dict。
    """
    params: dict[str, Any] = {}
    for key, value in kwargs.items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        params[key] = value
    return params


def parse_optional_int(value: str, field_name: str) -> int | None:
    """把工具收到的可选字符串参数解析成整数。

    输入：LangChain tool 传入的字符串值，以及用于报错展示的字段名。
    处理：空字符串表示“不筛选”，返回 None；非空字符串必须能转 int。
    输出：int 或 None；格式错误时抛 ValueError 给工具函数转成用户可读错误。
    """
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
    """统一调用 Java 后端业务接口。

    输入：HTTP method、接口 path、可选 query params 和 JSON body。
    处理：读取当前患者 token -> 组装完整 URL 和 headers -> 发送 httpx 请求 -> 格式化响应。
    输出：工具函数返回给模型的字符串；HTTP 或其他异常会转换成中文错误文案。
    """
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
    """把挂号记录 JSON 字符串整理成多行中文摘要。

    输入：api_call 返回的 raw 字符串，期望内容是挂号记录列表 JSON。
    处理：解析列表、映射状态码、挑选患者/科室/医生/日期等关键字段。
    输出：适合直接回复用户的挂号记录文本；不是列表或解析失败时原样返回。
    """
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
    """把费用订单 JSON 字符串整理成多行中文摘要。

    输入：api_call 返回的 raw 字符串，期望内容是费用订单列表 JSON。
    处理：解析列表、映射支付状态、展示订单 ID、单号和金额。
    输出：适合直接回复用户的费用订单文本；不是列表或解析失败时原样返回。
    """
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
    """把排班 JSON 字符串整理成多行中文摘要。

    输入：api_call 返回的 raw 字符串，期望内容是医生排班列表 JSON。
    处理：解析列表，提取排班 ID、科室、医生、日期、剩余号源和挂号费。
    输出：适合用户选择挂号排班的文本；不是列表或解析失败时原样返回。
    """
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
