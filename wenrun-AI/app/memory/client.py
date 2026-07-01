import logging
import os
from typing import Optional

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.memory.embeddings import DashScopeMultimodalEmbeddings, is_multimodal_embedding_model

load_dotenv()
logger = logging.getLogger(__name__)

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-v4")
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "1536"))


def _create_embeddings():
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        raise ValueError("未配置 OPENAI_API_KEY 或 DASHSCOPE_API_KEY")

    if is_multimodal_embedding_model(EMBEDDING_MODEL):
        dimension = EMBEDDING_DIMENSION if "2026-03-06" in EMBEDDING_MODEL else None
        return DashScopeMultimodalEmbeddings(
            model=EMBEDDING_MODEL,
            api_key=api_key,
            dimension=dimension,
        )

    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        base_url=os.getenv("OPENAI_BASE_URL"),
        api_key=api_key,
    )


embeddings = _create_embeddings()

_fallback_host = os.getenv("VECTOR_DATABASE_URL", "127.0.0.1")
_fallback_port = os.getenv("VECTOR_DATABASE_PORT", "6333")
QDRANT_URL = os.getenv("QDRANT_URL", f"http://{_fallback_host}:{_fallback_port}")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "wenrun_ai_memory")

_qdrant_client = QdrantClient(url=QDRANT_URL, check_compatibility=False)
_vector_store: Optional[QdrantVectorStore] = None


def _ensure_collection_exists() -> None:
    try:
        names = {c.name for c in _qdrant_client.get_collections().collections}
        if QDRANT_COLLECTION not in names:
            _qdrant_client.create_collection(
                collection_name=QDRANT_COLLECTION,
                vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE),
            )
            logger.info("Qdrant 集合已创建 | collection=%s dimension=%d", QDRANT_COLLECTION, EMBEDDING_DIMENSION)
            return

        info = _qdrant_client.get_collection(QDRANT_COLLECTION)
        existing_size = info.config.params.vectors.size
        if existing_size != EMBEDDING_DIMENSION:
            raise ValueError(
                f"集合 {QDRANT_COLLECTION} 维度为 {existing_size}，"
                f"与 EMBEDDING_DIMENSION={EMBEDDING_DIMENSION} 不一致"
            )
    except Exception as exc:
        logger.warning("Qdrant 集合初始化失败 | url=%s error=%s", QDRANT_URL, exc)


def get_vector_store() -> Optional[QdrantVectorStore]:
    global _vector_store
    if _vector_store is not None:
        return _vector_store

    try:
        _ensure_collection_exists()
        _vector_store = QdrantVectorStore(
            client=_qdrant_client,
            collection_name=QDRANT_COLLECTION,
            embedding=embeddings,
        )
        return _vector_store
    except Exception as exc:
        logger.error("向量存储初始化失败 | error=%s", exc)
        return None


def check_memory_health() -> dict:
    result = {
        "qdrant_url": QDRANT_URL,
        "collection": QDRANT_COLLECTION,
        "qdrant_ok": False,
        "embedding_ok": False,
        "ok": False,
    }

    try:
        _qdrant_client.get_collections()
        result["qdrant_ok"] = True
    except Exception as exc:
        result["qdrant_error"] = str(exc)
        return result

    try:
        embeddings.embed_query("health_check")
        result["embedding_ok"] = True
    except Exception as exc:
        result["embedding_error"] = str(exc)
        return result

    result["ok"] = True
    return result
