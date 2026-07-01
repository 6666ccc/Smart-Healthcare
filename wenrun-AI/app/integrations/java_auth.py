from app.core.config import Config


def api_key_headers() -> dict[str, str]:
    return {"X-API-Key": Config.JAVA_API_KEY}
