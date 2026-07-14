"""记忆功能启动健康检查：Qdrant 连接 + Embedding API 就绪状态。"""

from __future__ import annotations

import logging

from qdrant_client.models import Distance, VectorParams

from wenrun_ai.memory.embeddings import embed_query, get_vector_size
from wenrun_ai.memory.store import _get_client, _mark_collection_ensured
from wenrun_ai.settings import base

_health_logger = logging.getLogger("wenrun_ai.memory.health")


def check_memory_health() -> dict:
    """启动时检查 Qdrant + Embedding 是否就绪，并输出明确日志。

    供 app 启动时调用；所有异常都会被捕获，不会阻断服务启动。

    Returns:
        {
            "qdrant": True/False,
            "qdrant_error": str | None,
            "embedding": True/False,
            "embedding_error": str | None,
        }
    """
    result: dict = {
        "qdrant": False,
        "qdrant_error": None,
        "embedding": False,
        "embedding_error": None,
    }

    qdrant_url = base.get_qdrant_url()
    collection_name = base.get_qdrant_collection()

    # ── 检查 Qdrant 连接 ──
    _health_logger.info("=" * 50)
    _health_logger.info(" 记忆功能健康检查开始")
    _health_logger.info("   Qdrant URL: %s", qdrant_url)
    _health_logger.info("   Collection: %s", collection_name)
    _health_logger.info("   Embedding 模型: %s", base.get_embedding_model_name())

    try:
        client = _get_client()
        collections_info = client.get_collections()
        collection_names = {c.name for c in collections_info.collections}
        _health_logger.info(
            " Qdrant 连接成功 | 已有 %d 个 collection: %s",
            len(collection_names),
            ", ".join(collection_names) if collection_names else "（空）",
        )

        if collection_name not in collection_names:
            vector_size = get_vector_size()
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            _health_logger.info("已创建 Collection: %s", collection_name)
        else:
            info = client.get_collection(collection_name)
            points_count = info.points_count if info else 0
            _health_logger.info(
                " Collection [%s] 已存在 | 已存储 %d 条记忆",
                collection_name,
                points_count,
            )

        _mark_collection_ensured()
        result["qdrant"] = True

    except Exception as e:
        _health_logger.warning("❌ Qdrant 连接失败: %s", e)
        _health_logger.warning(
            "   记忆功能将降级：所有请求仍可正常对话，但不会检索或存储历史记忆。",
        )
        result["qdrant_error"] = str(e)

    # ── 检查 Embedding API ──
    try:
        test_vector = embed_query("health check")
        if test_vector and len(test_vector) > 0:
            _health_logger.info(
                " Embedding API 就绪 | 模型=%s | 向量维度=%d",
                base.get_embedding_model_name(),
                len(test_vector),
            )
            result["embedding"] = True
        else:
            raise ValueError("Embedding API 返回空向量")

    except Exception as e:
        _health_logger.warning(" Embedding API 不可用: %s", e)
        _health_logger.warning(
            "   请检查 EMBEDDING_MODEL 名称是否正确，以及 OPENAI_BASE_URL 是否支持 /v1/embeddings 端点。",
        )
        result["embedding_error"] = str(e)

    # ── 汇总 ──
    if result["qdrant"] and result["embedding"]:
        _health_logger.info(" 记忆功能就绪，可正常使用。")
    else:
        _health_logger.warning("  记忆功能未完全就绪，将降级为无记忆模式运行。")
    _health_logger.info("=" * 50)

    return result
