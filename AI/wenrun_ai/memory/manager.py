"""记忆生命周期管理：去重、TTL 过期清理、对话摘要。

提供：
- 写入前去重（避免重复存储）
- 定时清理过期记忆（TTL 过期）
- 对话摘要骨架（Phase 2 扩展到用户画像）
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from qdrant_client.models import (
    FieldCondition,
    Filter,
    Range,
)

from wenrun_ai.memory.retriever import search_memories
from wenrun_ai.memory.store import _get_client, add_memory, add_memory_pair
from wenrun_ai.settings import base

_manager_logger = logging.getLogger("wenrun_ai.memory.manager")

DEDUP_THRESHOLD = 0.95
DEFAULT_TTL_DAYS = 90


# ── 带去重的写入 ──

def add_memory_with_dedup(
    conversation_id: str,
    user_id: int | None,
    role: str,
    content: str,
    *,
    threshold: float = DEDUP_THRESHOLD,
    importance: int = 0,
    ttl_days: int = DEFAULT_TTL_DAYS,
) -> str | None:
    """带去重的记忆写入。与已有记忆高度相似时跳过新增。

    Args:
        conversation_id: 会话 ID。
        user_id:        用户 ID。
        role:           "user" 或 "assistant"。
        content:        消息文本。
        threshold:      余弦相似度阈值，>= 此值视为重复。
        importance:     重要性 1-5。
        ttl_days:       过期天数。

    Returns:
        point id；去重跳过时返回 None。
    """
    if not content.strip():
        return None

    existing = search_memories(conversation_id, content, top_k=1)
    if existing and existing[0]["score"] >= threshold:
        _manager_logger.debug(
            "记忆去重跳过 | conv=%s | score=%.3f",
            conversation_id,
            existing[0]["score"],
        )
        return None

    return add_memory(
        conversation_id, user_id, role, content,
        importance=importance, ttl_days=ttl_days,
    )


def add_memory_pair_with_dedup(
    conversation_id: str,
    user_id: int | None,
    user_message: str,
    assistant_reply: str,
    *,
    threshold: float = DEDUP_THRESHOLD,
    importance_user: int = 0,
    importance_assistant: int = 0,
    ttl_days: int = DEFAULT_TTL_DAYS,
) -> None:
    """带去重的批量记忆写入（用户提问 + 助手回复）。

    对两条消息分别做去重检查；任一命中则跳过对应消息。
    两条都命中时完全跳过写入，减少不必要的 Embedding API 调用。
    """
    should_store_user = True
    should_store_assistant = True

    if user_message.strip():
        existing = search_memories(conversation_id, user_message, top_k=1)
        if existing and existing[0]["score"] >= threshold:
            should_store_user = False
            _manager_logger.debug("记忆对-用户侧去重跳过 | conv=%s", conversation_id)

    if assistant_reply.strip():
        existing = search_memories(conversation_id, assistant_reply, top_k=1)
        if existing and existing[0]["score"] >= threshold:
            should_store_assistant = False
            _manager_logger.debug("记忆对-助手侧去重跳过 | conv=%s", conversation_id)

    # 两侧都跳过则完全不入库
    if not should_store_user and not should_store_assistant:
        return

    # 两侧都通过则批量写入（最高效，一次 API 调用）
    if should_store_user and should_store_assistant:
        add_memory_pair(
            conversation_id, user_id, user_message, assistant_reply,
            importance_user=importance_user,
            importance_assistant=importance_assistant,
            ttl_days=ttl_days,
        )
        return

    # 单侧通过：逐条写入
    if should_store_user:
        add_memory(
            conversation_id, user_id, "user", user_message,
            importance=importance_user, ttl_days=ttl_days,
        )
    if should_store_assistant:
        add_memory(
            conversation_id, user_id, "assistant", assistant_reply,
            importance=importance_assistant, ttl_days=ttl_days,
        )


# ── TTL 过期清理 ──

def cleanup_expired_memories() -> int:
    """删除所有已过期的会话记忆。

    按 expire_at 字段过滤，删除 expire_at < now 的所有 point。
    建议通过 uvicorn lifespan 或外部 cron 每小时调用一次。

    Returns:
        删除的 point 数量。
    """
    try:
        client = _get_client()
        collection_name = base.get_qdrant_collection()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 先统计
        count_result = client.count(
            collection_name=collection_name,
            count_filter=Filter(
                must=[
                    FieldCondition(key="expire_at", range=Range(lt=now_iso)),
                ]
            ),
        )

        if count_result and count_result.count > 0:
            client.delete(
                collection_name=collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(key="expire_at", range=Range(lt=now_iso)),
                    ]
                ),
            )
            _manager_logger.info(
                "TTL 清理完成 | deleted=%d | collection=%s",
                count_result.count, collection_name,
            )
        else:
            _manager_logger.debug("TTL 清理：无过期记忆")

        return count_result.count if count_result else 0

    except Exception:
        _manager_logger.exception("TTL 清理失败")
        return 0
