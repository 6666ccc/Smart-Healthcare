"""
API Key 认证 —— 服务间调用的轻量认证方式。

使用预共享密钥（X-API-Key 请求头）替代原来的 OAuth2 client_credentials 模式。
无需获取/刷新令牌，直接读取配置中的 API Key 即可。
"""

from app.core.config import Config


def get_api_key() -> str:
    """返回服务间调用的 API Key。"""
    return Config.JAVA_API_KEY


def api_key_headers() -> dict[str, str]:
    """返回带 API Key 的请求头字典，供 httpx 直接使用。"""
    return {"X-API-Key": Config.JAVA_API_KEY}
