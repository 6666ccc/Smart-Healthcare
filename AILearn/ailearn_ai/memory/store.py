"""Qdrant 记忆存储：embed 文本 → 写入向量库 → 语义检索 → 注入 Prompt。

Embedding 调用使用 httpx 直连 OpenAI 兼容 API，而非 langchain_openai 封装，
原因是百炼 DashScope 的 /v1/embeddings 兼容端点对 langchain 自动附加的
额外参数（如 dimensions、encoding_format）敏感，会返回 InvalidParameter 错误。
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

import httpx

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from ailearn_ai.settings import base

_memory_logger = logging.getLogger("ailearn_ai.memory")

DEFAULT_TOP_K = 5

# ---------- 懒加载单例 ----------

_client: QdrantClient | None = None
_collection_ensured: bool = False
_vector_size: int | None = None


def _get_client() -> QdrantClient:
    """懒加载 Qdrant 客户端。"""
    global _client
    if _client is None:
        url = base.get_qdrant_url()
        api_key = base.get_qdrant_api_key()
        _memory_logger.info("连接 Qdrant | url=%s | auth=%s", url, bool(api_key))
        _client = QdrantClient(url=url, api_key=api_key)
    return _client


# ---------- Embedding（httpx 直连，绕过 langchain 封装） ----------

def _get_embedding_api_info() -> tuple[str, str, str, str | None]:
    """返回 (base_url, api_key, model, 完整 endpoint URL)。"""
    api_key = base.get_openai_api_key()
    base_url = base.get_openai_base_url() or "https://api.openai.com/v1"
    model = base.get_embedding_model_name()
    endpoint = f"{base_url}/embeddings"
    return base_url, api_key, model, endpoint


def _call_embedding_api(texts: list[str]) -> list[list[float]]:
    """调用 OpenAI 兼容 /v1/embeddings 端点，返回向量列表。

    Args:
        texts: 待向量化的文本列表。

    Returns:
        与 texts 一一对应的向量列表。
    """
    _, api_key, model, endpoint = _get_embedding_api_info()

    response = httpx.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "input": texts,
        },
        timeout=30.0,
    )
    response.raise_for_status()
    body = response.json()

    # OpenAI 兼容格式: {"data": [{"embedding": [...], "index": 0}, ...]}
    data_items = sorted(body["data"], key=lambda d: d["index"])
    return [item["embedding"] for item in data_items]


def embed_query(text: str) -> list[float]:
    """单条文本向量化。"""
    return _call_embedding_api([text])[0]


def embed_documents(texts: list[str]) -> list[list[float]]:
    """批量文本向量化，一次 API 调用。"""
    if not texts:
        return []
    return _call_embedding_api(texts)


def _get_vector_size() -> int:
    """通过一次实际的 embedding 调用探测向量维度，避免硬编码。"""
    global _vector_size
    if _vector_size is not None:
        return _vector_size

    test_vector = embed_query("vector size probe")
    _vector_size = len(test_vector)
    _memory_logger.info("向量维度探测结果: %d (模型=%s)", _vector_size, base.get_embedding_model_name())
    return _vector_size


def _ensure_collection() -> None:
    """确保 Qdrant collection 已创建（幂等）。"""
    global _collection_ensured
    if _collection_ensured:
        return
    client = _get_client()
    collection_name = base.get_qdrant_collection()
    existing = {c.name for c in client.get_collections().collections}
    if collection_name not in existing:
        vector_size = _get_vector_size()
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        _memory_logger.info("已创建 Qdrant collection: %s", collection_name)
    _collection_ensured = True


# ---------- 公开 API ----------

def add_memory(
    conversation_id: str,
    user_id: int | None,
    role: str,
    content: str,
) -> str | None:
    """存储单条对话记忆到 Qdrant。

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
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
            ],
        )

        _memory_logger.debug(
            "记忆已写入 | conv=%s | role=%s | len=%d",
            conversation_id,
            role,
            len(content),
        )
        return point_id

    except Exception:
        _memory_logger.exception("写入记忆失败，跳过存储")
        return None


def add_memory_pair(
    conversation_id: str,
    user_id: int | None,
    user_message: str,
    assistant_reply: str,
) -> None:
    """便捷方法：同时存储用户提问与助手回复两条记忆。

    线程最佳实践：用 embed_documents() 做批量向量化，一次 API 调用解决两条文本。
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
        for role, text in [("user", user_message), ("assistant", assistant_reply)]:
            stripped = text.strip()
            if stripped:
                texts.append(stripped)
                roles.append(role)

        if not texts:
            return

        # 批量 embedding，一次 API 调用
        vectors = embed_documents(texts)

        points: list[PointStruct] = []
        now = datetime.now(timezone.utc).isoformat()
        for text, role, vector in zip(texts, roles, vectors):
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "role": role,
                        "content": text,
                        "created_at": now,
                    },
                )
            )

        client.upsert(collection_name=collection_name, points=points)

        _memory_logger.debug(
            "记忆对已写入 | conv=%s | user_len=%d | assistant_len=%d",
            conversation_id,
            len(user_message.strip()) if user_message else 0,
            len(assistant_reply.strip()) if assistant_reply else 0,
        )

    except Exception:
        _memory_logger.exception("写入记忆对失败，跳过存储")


def search_memories(
    conversation_id: str,
    query: str,
    top_k: int = DEFAULT_TOP_K,
) -> list[dict]:
    """根据当前问题语义检索最相关历史记忆。

    Args:
        conversation_id: 会话 ID（过滤条件，只查当前会话）。
        query:       当前用户提问文本。
        top_k:       返回 Top-K 条最相似记忆。

    Returns:
        [{"role": "user"|"assistant", "content": "...", "score": 0.95}, ...]
    """
    if not query.strip():
        return []

    try:
        _ensure_collection()
        client = _get_client()
        collection_name = base.get_qdrant_collection()

        vector = embed_query(query)

        results = client.query_points(
            collection_name=collection_name,
            query=vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="conversation_id",
                        match=MatchValue(value=conversation_id),
                    )
                ]
            ),
            limit=top_k,
        )

        memories: list[dict] = []
        for hit in results.points:
            if hit.payload:
                memories.append(
                    {
                        "role": str(hit.payload.get("role", "")),
                        "content": str(hit.payload.get("content", "")),
                        "score": float(hit.score),
                    }
                )

        _memory_logger.debug(
            "记忆检索 | conv=%s | query_len=%d | hits=%d",
            conversation_id,
            len(query),
            len(memories),
        )
        return memories

    except Exception:
        _memory_logger.exception("记忆检索失败，返回空列表")
        return []


def format_memories_for_prompt(memories: list[dict]) -> str | None:
    """将检索到的记忆格式化为可注入 Prompt 的文本块。

    返回格式：
        <conversation_memory>
        --- 记忆片段 1 (用户) ---
        你好
        --- 记忆片段 2 (助手) ---
        ...
        </conversation_memory>
    """
    if not memories:
        return None

    lines = [
        "<conversation_memory>",
        "以下是该会话中与本轮问题语义最相关的历史对话片段，供参考：",
        "",
    ]

    for i, mem in enumerate(memories, 1):
        role_cn = "用户" if mem["role"] == "user" else "助手"
        lines.append(f"--- 记忆片段 {i}（{role_cn}）---")
        lines.append(mem["content"])
        lines.append("")

    lines.append(
        "如果以上记忆与当前问题无关，请忽略。若引用记忆内容作答，"
        "请自然告知用户这是基于之前的对话。"
    )
    lines.append("</conversation_memory>")

    return "\n".join(lines)


# ---------- 启动健康检查 ----------

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
    _memory_logger.info("=" * 50)
    _memory_logger.info(" 记忆功能健康检查开始")
    _memory_logger.info("   Qdrant URL: %s", qdrant_url)
    _memory_logger.info("   Collection: %s", collection_name)
    _memory_logger.info("   Embedding 模型: %s", base.get_embedding_model_name())

    try:
        client = _get_client()
        # 尝试获取集群信息以验证连接
        collections_info = client.get_collections()
        collection_names = {c.name for c in collections_info.collections}
        _memory_logger.info(
            " Qdrant 连接成功 | 已有 %d 个 collection: %s",
            len(collection_names),
            ", ".join(collection_names) if collection_names else "（空）",
        )

        # 确保目标 collection 存在
        if collection_name not in collection_names:
            vector_size = _get_vector_size()
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            _memory_logger.info("已创建 Collection: %s", collection_name)
        else:
            # 获取 collection 详情
            info = client.get_collection(collection_name)
            points_count = info.points_count if info else 0
            _memory_logger.info(
                " Collection [%s] 已存在 | 已存储 %d 条记忆",
                collection_name,
                points_count,
            )

        global _collection_ensured
        _collection_ensured = True
        result["qdrant"] = True

    except Exception as e:
        _memory_logger.warning(
            "❌ Qdrant 连接失败: %s",
            e,
        )
        _memory_logger.warning(
            "   记忆功能将降级：所有请求仍可正常对话，但不会检索或存储历史记忆。",
        )
        result["qdrant_error"] = str(e)

    # ── 检查 Embedding API ──
    try:
        test_vector = embed_query("health check")
        if test_vector and len(test_vector) > 0:
            _memory_logger.info(
                " Embedding API 就绪 | 模型=%s | 向量维度=%d",
                base.get_embedding_model_name(),
                len(test_vector),
            )
            result["embedding"] = True
        else:
            raise ValueError("Embedding API 返回空向量")

    except Exception as e:
        _memory_logger.warning(
            " Embedding API 不可用: %s",
            e,
        )
        _memory_logger.warning(
            "   请检查 EMBEDDING_MODEL 名称是否正确，以及 OPENAI_BASE_URL 是否支持 /v1/embeddings 端点。",
        )
        result["embedding_error"] = str(e)

    # ── 汇总 ──
    if result["qdrant"] and result["embedding"]:
        _memory_logger.info(" 记忆功能就绪，可正常使用。")
    else:
        _memory_logger.warning("  记忆功能未完全就绪，将降级为无记忆模式运行。")
    _memory_logger.info("=" * 50)

    return result
