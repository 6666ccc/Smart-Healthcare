from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()  # 加载 .env 文件中的环境变量


class Config:
    # Java 服务配置
    JAVA_BASE_URL = os.getenv("JAVA_BASE_URL", "http://127.0.0.1:8080")

    # OAuth2 配置
    OAUTH_TOKEN_URL = f"{JAVA_BASE_URL}/oauth2/token"
    OAUTH_CLIENT_ID = os.getenv("OAUTH_CLIENT_ID", "ai-service")
    OAUTH_CLIENT_SECRET = os.getenv("OAUTH_CLIENT_SECRET", "ai-service-dev-secret-2026")

    # 请求配置
    REQUEST_TIMEOUT = 30
    MAX_RETRIES = 3


class Settings(BaseSettings):
    """全局配置：FastAPI 服务基础参数。"""

    JAVA_CLIEN_TIMEOUT: int = 30
    # 为Java调用规范API版本前缀
    API_V1_STR: str = "/api/v1"


settings = Settings()
