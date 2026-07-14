"""Qdrant 记忆核心存储：连接管理、Collection 维护、读写操作。

Embedding 调用已拆分至 embeddings.py，检索/格式化已拆分至 retriever.py。
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    VectorParams,
)

from wenrun_ai.memory.embeddings import embed_documents, embed_query, get_vector_size
from wenrun_ai.settings import base

_store_logger = logging.getLogger("wenrun_ai.memory.store")

# ---------- 懒加载单例 ----------

_client: QdrantClient | None = None
_collection_ensured: bool = False


def _get_client() -> QdrantClient:
    """懒加载 Qdrant 客户端（模块级单例）。"""
    global _client
    if _client is None:
        url = base.get_qdrant_url()
        api_key = base.get_qdrant_api_key()
        _store_logger.info("连接 Qdrant | url=%s | auth=%s", url, bool(api_key))
        _client = QdrantClient(url=url, api_key=api_key)
    return _client


def _ensure_collection() -> None:
    """确保 Qdrant collection 已创建（幂等）。"""
    global _collection_ensured
    if _collection_ensured:
        return
    client = _get_client()
    collection_name = base.get_qdrant_collection()
    existing = {c.name for c in client.get_collections().collections}
    if collection_name not in existing:
        vector_size = get_vector_size()
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        _store_logger.info("已创建 Qdrant collection: %s", collection_name)
    _collection_ensured = True


def _mark_collection_ensured() -> None:
    """供 health 模块在启动检查成功后标记 collection 已就绪。

    避免健康检查和后续写入各探测一次向量维度。
    """
    global _collection_ensured
    _collection_ensured = True


# ---------- 公开写入 API ----------

def add_memory(
    conversation_id: str,
    user_id: int | None,
    role: str,
    content: str,
    *,
    importance: int = 0,
    ttl_days: int = 90,
) -> str | None:
    """存储单条对话记忆到 Qdrant。

    Args:
        importance: 重要性 1-5，0 表示未评分。
        ttl_days: 过期天数，默认 90 天后自动清理。

    Returns:
        point id（UUID 字符串）；失败返回 None。
    """
    if not content.strip():
        return None

    try:
        _ensure_collection()
        client = _get_client()
        collection_name = base.get_qdrant_collection()

        point_id = str(uuid.uuid4())
        vector = embed_query(content)
        now = datetime.now(timezone.utc)

        client.upsert(
            collection_name=collection_name,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "role": role,
                        "content": content,
                        "importance": importance,
                        "created_at": now.isoformat(),
                        "expire_at": (now + timedelta(days=ttl_days)).isoformat(),
                    },
                )
            ],
        )

        _store_logger.debug(
            "记忆已写入 | conv=%s | role=%s | len=%d",
            conversation_id,
            role,
            len(content),
        )
        return point_id

    except Exception:
        _store_logger.exception("写入记忆失败，跳过存储")
        return None


def add_memory_pair(
    conversation_id: str,
    user_id: int | None,
    user_message: str,
    assistant_reply: str,
    *,
    importance_user: int = 0,
    importance_assistant: int = 0,
    ttl_days: int = 90,
) -> None:
    """便捷方法：同时存储用户提问与助手回复两条记忆。

    用 embed_documents() 做批量向量化，一次 API 调用解决两条文本。

    Args:
        importance_user: 用户消息重要性 1-5。
        importance_assistant: 助手回复重要性 1-5。
        ttl_days: 过期天数。
    """
    if not user_message.strip() and not assistant_reply.strip():
        return

    try:
        _ensure_collection()
        client = _get_client()
        collection_name = base.get_qdrant_collection()

        # 构建需要 embedding 的文本列表（跳过空内容）
        texts: list[str] = []
        roles: list[str] = []
        importances: list[int] = []
        for role, text, imp in [
            ("user", user_message, importance_user),
            ("assistant", assistant_reply, importance_assistant),
        ]:
            stripped = text.strip()
            if stripped:
                texts.append(stripped)
                roles.append(role)
                importances.append(imp)

        if not texts:
            return

        # 批量 embedding，一次 API 调用
        vectors = embed_documents(texts)

        points: list[PointStruct] = []
        now = datetime.now(timezone.utc)
        expire_at = (now + timedelta(days=ttl_days)).isoformat()
        now_iso = now.isoformat()
        for text, role, vector, imp in zip(texts, roles, vectors, importances):
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "role": role,
                        "content": text,
                        "importance": imp,
                        "created_at": now_iso,
                        "expire_at": expire_at,
                    },
                )
            )

        client.upsert(collection_name=collection_name, points=points)

        _store_logger.debug(
            "记忆对已写入 | conv=%s | user_len=%d | assistant_len=%d",
            conversation_id,
            len(user_message.strip()) if user_message else 0,
            len(assistant_reply.strip()) if assistant_reply else 0,
        )

    except Exception:
        _store_logger.exception("写入记忆对失败，跳过存储")
