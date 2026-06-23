"""
OAuth2 Token 管理服务

使用 client_credentials 模式从 Java 端获取 access_token，
自动在过期前刷新，保证调用 Java API 时始终持有有效令牌。
"""

import asyncio
import logging
import time

import httpx

from app.core.config import Config

logger = logging.getLogger(__name__)

# 提前 60 秒刷新，避免边界情况
_REFRESH_BUFFER_SECONDS = 60


class TokenManager:
    """OAuth2 令牌生命周期管理器（单例）"""

    def __init__(self) -> None:
        self._access_token: str | None = None
        self._expires_at: float = 0.0  # Unix 时间戳，令牌过期时刻
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # 内部方法
    # ------------------------------------------------------------------

    async def _request_token(self) -> tuple[str, int]:
        """向 OAuth2 端点发起 client_credentials 请求。

        Returns
        -------
        (access_token, expires_in_seconds)
        """
        async with httpx.AsyncClient(timeout=Config.REQUEST_TIMEOUT) as client:
            resp = await client.post(
                Config.OAUTH_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": Config.OAUTH_CLIENT_ID,
                    "client_secret": Config.OAUTH_CLIENT_SECRET,
                },
            )
            resp.raise_for_status()
            body = resp.json()
            return body["access_token"], int(body.get("expires_in", 3600))

    # ------------------------------------------------------------------
    # 公开方法
    # ------------------------------------------------------------------

    async def get_token(self) -> str:
        """获取当前有效的 access_token，若即将过期则自动刷新。

        双重检查 + 异步锁保证并发安全：多协程同时请求时只刷新一次。
        """
        now = time.time()

        # ---- 快路径：令牌仍然有效 ----
        if self._access_token and now < self._expires_at - _REFRESH_BUFFER_SECONDS:
            return self._access_token

        # ---- 慢路径：需要刷新 ----
        async with self._lock:
            # 双重检查 —— 可能其他协程已经刷新了
            if self._access_token and now < self._expires_at - _REFRESH_BUFFER_SECONDS:
                return self._access_token

            access_token, expires_in = await self._request_token()
            self._access_token = access_token
            self._expires_at = time.time() + expires_in

            logger.info(
                "OAuth2 令牌已刷新，%d 秒后过期", expires_in,
            )
            return self._access_token

    async def startup_refresh(self) -> None:
        """应用启动时预取令牌（失败不阻塞服务启动）。"""
        try:
            await self.get_token()
            logger.info("OAuth2 令牌初始化成功")
        except Exception:
            logger.exception("OAuth2 令牌初始化失败，将在首次请求时重试")

    def invalidate(self) -> None:
        """强制作废当前令牌，下次 get_token() 会重新获取。"""
        self._access_token = None
        self._expires_at = 0.0
        logger.info("OAuth2 令牌已手动作废")


# ------------------------------------------------------------------
# 模块级单例 —— 整个应用共享同一个 TokenManager
# ------------------------------------------------------------------

token_manager = TokenManager()
