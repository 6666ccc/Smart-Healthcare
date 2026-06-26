import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Java 服务配置
    JAVA_BASE_URL = os.getenv("JAVA_BASE_URL", "http://127.0.0.1:8080")

    # API Key 认证（服务间调用，替换了原来的 OAuth2 client_credentials）
    JAVA_API_KEY = os.getenv("WENRUN_API_KEY", "wenrun-dev-api-key-change-in-prod")

    # 请求配置
    REQUEST_TIMEOUT = 30
    MAX_RETRIES = 3
