"""Embedding 向量化：httpx 直连 OpenAI 兼容 API。

不使用 langchain_openai 封装的原因是百炼 DashScope 的 /v1/embeddings
兼容端点对 langchain 自动附加的额外参数（如 dimensions、encoding_format）
敏感，会返回 InvalidParameter 错误。
"""

from __future__ import annotations

import logging

import httpx

from wenrun_ai.settings import base

_embeddings_logger = logging.getLogger("wenrun_ai.memory.embeddings")

# 缓存探测到的向量维度，避免重复调用 API
_vector_size: int | None = None


def _get_embedding_api_info() -> tuple[str, str, str, str]:
    """返回 (base_url, api_key, model, 完整 endpoint URL)。"""
    api_key = base.get_openai_api_key()
    api_base = base.get_openai_base_url() or "https://api.openai.com/v1"
    model = base.get_embedding_model_name()
    endpoint = f"{api_base}/embeddings"
    return api_base, api_key, model, endpoint


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


def get_vector_size() -> int:
    """通过一次实际的 embedding 调用探测向量维度，避免硬编码。

    结果会被缓存（模块级 _vector_size），后续调用直接返回缓存值。
    """
    global _vector_size
    if _vector_size is not None:
        return _vector_size

    test_vector = embed_query("vector size probe")
    _vector_size = len(test_vector)
    _embeddings_logger.info(
        "向量维度探测结果: %d (模型=%s)",
        _vector_size,
        base.get_embedding_model_name(),
    )
    return _vector_size
