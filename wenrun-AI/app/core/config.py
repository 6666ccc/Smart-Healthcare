import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    JAVA_BASE_URL = os.getenv("JAVA_BASE_URL", "http://127.0.0.1:8080")
    JAVA_API_KEY = os.getenv("WENRUN_API_KEY", "wenrun-dev-api-key-change-in-prod")
    REQUEST_TIMEOUT = 30
