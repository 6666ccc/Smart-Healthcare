"""HuiLiao 后端 HTTP 客户端，供 LangChain Tools 调用。"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from ailearn_ai.settings import base

_client_logger = logging.getLogger("ailearn_ai.tools")


def _client() -> httpx.Client:
    return httpx.Client(
        base_url=base.get_huiliao_api_base_url(),
        headers=base.get_huiliao_auth_headers(),
        timeout=30.0,
    )


def api_request(
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """发起请求并返回统一响应体 Result<T>。"""
    headers = base.get_huiliao_auth_headers()
    if "X-Api-Key" not in headers:
        _client_logger.warning(
            "回调 Java 未携带 X-Api-Key | %s %s（请检查 /v1/chat body 是否传入 apiKey）",
            method,
            path,
        )

    try:
        with _client() as client:
            response = client.request(method, path, params=params, json=json_body)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        try:
            body = e.response.json()
            return {
                "code": body.get("code", e.response.status_code),
                "message": body.get("message", str(e)),
                "data": None,
            }
        except (json.JSONDecodeError, ValueError):
            return {"code": e.response.status_code, "message": str(e), "data": None}
    except httpx.RequestError as e:
        return {"code": -1, "message": f"无法连接 HuiLiao 后端: {e}", "data": None}


def format_result(result: dict[str, Any]) -> str:
    """将 Result<T> 格式化为供 LLM 阅读的字符串。"""
    code = result.get("code")
    if code == 200:
        data = result.get("data")
        if data is None:
            return "操作成功，无返回数据。"
        return json.dumps(data, ensure_ascii=False, indent=2, default=str)
    message = result.get("message") or "请求失败"
    return f"错误(code={code}): {message}"
