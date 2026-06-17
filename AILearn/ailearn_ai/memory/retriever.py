"""记忆检索：语义搜索历史对话 + 格式化注入 Prompt。"""

from __future__ import annotations

import logging

from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchValue,
)

from ailearn_ai.memory.embeddings import embed_query
from ailearn_ai.memory.store import _ensure_collection, _get_client
from ailearn_ai.settings import base

_retriever_logger = logging.getLogger("ailearn_ai.memory.retriever")

DEFAULT_TOP_K = 5


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
                        "importance": int(hit.payload.get("importance", 0)),
                    }
                )

        _retriever_logger.debug(
            "记忆检索 | conv=%s | query_len=%d | hits=%d",
            conversation_id,
            len(query),
            len(memories),
        )
        return memories

    except Exception:
        _retriever_logger.exception("记忆检索失败，返回空列表")
        return []


def search_memories_weighted(
    conversation_id: str,
    query: str,
    top_k: int = DEFAULT_TOP_K,
) -> list[dict]:
    """带重要性加权的记忆检索。

    在语义相似度的基础上乘以重要性系数：weighted_score = similarity_score * (1.0 + 0.2 * importance)

    Args:
        conversation_id: 会话 ID。
        query:       当前用户提问文本。
        top_k:       返回 Top-K 条。

    Returns:
        [{"role": ..., "content": ..., "score": ..., "importance": ...}, ...]
    """
    raw = search_memories(conversation_id, query, top_k=top_k * 2)  # 多召回再重排

    for mem in raw:
        imp = mem.get("importance", 0)
        if isinstance(imp, (int, float)) and imp > 0:
            mem["raw_score"] = mem["score"]
            mem["score"] = mem["score"] * (1.0 + 0.2 * imp)
            mem["importance"] = int(imp)

    # 按加权分数重排
    raw.sort(key=lambda x: x.get("score", 0), reverse=True)
    return raw[:top_k]


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
