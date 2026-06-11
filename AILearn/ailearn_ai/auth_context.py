"""当前请求的 API 上下文（供 Tools 回调 Java 时使用）。

Java AiChatController 注入 apiKey 到 DTO body → 本模块存储 → Tools 回调 Java 时通过
X-Api-Key / X-User-Id 请求头传递，由 Java AuthInterceptor 识别放行。
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar, Token

_request_api_key: ContextVar[str | None] = ContextVar("huiliao_api_key", default=None)
_request_user_id: ContextVar[int | None] = ContextVar("huiliao_user_id", default=None)


def get_api_key() -> str | None:
    """获取当前请求的内部 API Key（由 Java 注入或 .env fallback）。"""
    return _request_api_key.get()


def get_user_id() -> int | None:
    """获取当前请求的用户 ID（由 Java 注入），用于回调 Java 时设置 X-User-Id。"""
    return _request_user_id.get()


@contextmanager
def huiliao_api_context(api_key: str | None, user_id: int | None = None):
    """在 Agent 执行期间绑定 api_key 与 user_id，结束后自动恢复。

    Tools 回调 Java 时通过 get_huiliao_auth_headers() 读取这些值，
    设置 X-Api-Key 与 X-User-Id 请求头。
    """
    from ailearn_ai.settings import base

    key = api_key or base.get_huiliao_api_key()
    reset_key: Token = _request_api_key.set(key)
    reset_uid: Token = _request_user_id.set(user_id)
    try:
        yield
    finally:
        _request_api_key.reset(reset_key)
        _request_user_id.reset(reset_uid)
