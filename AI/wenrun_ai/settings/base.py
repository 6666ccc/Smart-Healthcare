import os

from dotenv import load_dotenv

load_dotenv()


def get_openai_api_key() -> str:
    key = (os.getenv("OPENAI_API_KEY") or os.getenv("DASHSCOPE_API_KEY") or "").strip()
    if not key:
        raise ValueError("请在 .env 中配置 OPENAI_API_KEY 或 DASHSCOPE_API_KEY")
    return key


def get_openai_base_url() -> str | None:
    url = (os.getenv("OPENAI_BASE_URL") or "").strip().rstrip("/")
    return url or None


def get_chat_model_name() -> str:
    return (os.getenv("OPENAI_CHAT_MODEL") or "gpt-4o-mini").strip()


def get_wenrun_api_base_url() -> str:
    return (os.getenv("WENRUN_API_BASE_URL") or "http://localhost:8080").strip().rstrip("/")


def get_wenrun_api_token() -> str:
    """已废弃：改用 get_wenrun_api_key()。保留以兼容旧配置。"""
    return (os.getenv("WENRUN_API_TOKEN") or os.getenv("WENRUN_TOKEN") or "").strip()


def get_wenrun_api_key() -> str:
    """内部 API Key，用于 AI 服务回调 Java 时的服务间鉴权（X-Api-Key 头）。

    优先级：WENRUN_API_KEY > WENRUN_API_TOKEN（旧兼容）> WENRUN_TOKEN（旧兼容）。
    """
    return (
        os.getenv("WENRUN_API_KEY")
        or os.getenv("WENRUN_API_TOKEN")
        or os.getenv("WENRUN_TOKEN")
        or ""
    ).strip()


def get_wenrun_auth_headers() -> dict[str, str]:
    """构建回调 Java 的请求头：X-Api-Key（服务间鉴权）+ X-User-Id（用户上下文）。

    优先使用当前请求上下文（ContextVar），否则回退 .env 配置。
    """
    from wenrun_ai.auth_context import get_api_key, get_user_id

    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    api_key = get_api_key() or get_wenrun_api_key()
    if api_key:
        headers["X-Api-Key"] = api_key

    user_id = get_user_id()
    if user_id is not None:
        headers["X-User-Id"] = str(user_id)

    return headers


def get_qdrant_url() -> str:
    return (os.getenv("QDRANT_URL") or "http://localhost:6333").strip().rstrip("/")


def get_qdrant_api_key() -> str | None:
    key = (os.getenv("QDRANT_API_KEY") or "").strip()
    return key or None


def get_qdrant_collection() -> str:
    return (os.getenv("QDRANT_COLLECTION") or "chat_memory").strip()


def get_knowledge_embedding_batch_size() -> int:
    return int(os.getenv("KNOWLEDGE_EMBEDDING_BATCH_SIZE") or "32")


def get_knowledge_max_file_size() -> int:
    return int(os.getenv("KNOWLEDGE_MAX_FILE_SIZE") or str(20 * 1024 * 1024))


def get_knowledge_top_k() -> int:
    return int(os.getenv("KNOWLEDGE_TOP_K") or "5")


def get_knowledge_score_threshold() -> float:
    return float(os.getenv("KNOWLEDGE_SCORE_THRESHOLD") or "0.45")


def get_embedding_model_name() -> str:
    return (os.getenv("EMBEDDING_MODEL") or "text-embedding-3-small").strip()


def get_log_level() -> str:
    return (os.getenv("AI_LOG_LEVEL") or "INFO").strip().upper()


def get_log_file() -> str | None:
    path = (os.getenv("AI_LOG_FILE") or "").strip()
    return path or None


def get_app_timezone() -> str:
    """应用时区，用于向 LLM 注入「当前时间」上下文。默认东八区。"""
    return (os.getenv("APP_TIMEZONE") or "Asia/Shanghai").strip()
