"""
记忆存储模块 — 基于 Qdrant 向量数据库实现长期记忆的增删查改。

记忆类型说明：
- conversation: 普通对话记录（默认类型）
- fact:         用户陈述的重要事实（如"我对青霉素过敏"）
- preference:   用户偏好（如"我喜欢看心内科的专家号"）

每条记忆在 Qdrant 中的 payload 结构：
{
    "memory_id":    唯一标识（UUID4）
    "user_id":      用户 ID，用于隔离不同用户的记忆
    "session_id":   会话 ID，用于追溯对话上下文
    "message_type": "user" | "assistant"
    "intent":       意图分类（medical / registration / chat）
    "memory_type":  "conversation" | "fact" | "preference"
    "timestamp":    ISO 8601 时间戳（UTC）
    "page_content": 原始文本内容
}

检索策略：
- retrieve_relevant:  语义相似度搜索 → 适用于"找与当前问题相关的内容"
- get_session_history: 按 session_id 过滤 + 时间排序 → 适用于"回顾对话上下文"
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from qdrant_client.models import Condition, FieldCondition, Filter, FilterSelector, MatchValue

from app.memory.config_memory import _qdrant_client, vector_store

logger = logging.getLogger(__name__)


# ==============================================================================
# MemoryStore — 记忆存储管理器
# ==============================================================================


class MemoryStore:
    """
    记忆存储管理器，封装 Qdrant 的 CRUD 操作。

    所有写操作（store_memory）使用 QdrantVectorStore 写入向量 + 元数据，
    所有读操作（retrieve_relevant）使用 similarity_search 做语义检索，
    所有管理操作（delete_user_memories）使用 QdrantClient 原始 API。
    """

    def store_memory(
        self,
        user_id: str,
        session_id: str,
        content: str,
        message_type: str = "user",
        intent: str = "chat",
        memory_type: str = "conversation",
    ) -> str | None:
        """
        存储一条对话记忆。

        参数：
            user_id:      用户唯一标识（用于检索时的隔离过滤）
            session_id:   会话唯一标识（用于按会话回溯）
            content:      要存储的文本内容（用户消息或 AI 回复）
            message_type: 消息来源 "user" | "assistant"
            intent:       意图分类 "medical" | "registration" | "chat"
            memory_type:  记忆类型 "conversation" | "fact" | "preference"

        返回：
            memory_id: 记忆的唯一标识符，失败时返回 None
        """
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        # 构建元数据 — 这些字段会作为 Qdrant payload 存储在向量点中
        # 后续可通过 payload 字段进行过滤查询
        metadata: dict[str, Any] = {
            "memory_id": memory_id,
            "user_id": user_id,
            "session_id": session_id,
            "message_type": message_type,
            "intent": intent,
            "memory_type": memory_type,
            "timestamp": timestamp,
        }

        try:
            # add_texts 内部会：
            # 1. 调用 embeddings 将 content 转为 1536 维向量
            # 2. 将向量 + metadata 一起存入 Qdrant
            vector_store.add_texts(texts=[content], metadatas=[metadata])
            logger.debug(
                "记忆已存储 | memory_id=%s user_id=%s session_id=%s "
                "type=%s intent=%s content_len=%d",
                memory_id,
                user_id,
                session_id,
                message_type,
                intent,
                len(content),
            )
            return memory_id
        except Exception as exc:
            logger.error(
                "记忆存储失败 | user_id=%s session_id=%s error=%s",
                user_id,
                session_id,
                exc,
            )
            return None

    def retrieve_relevant(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """
        语义检索：用当前查询文本搜索用户最相关的历史记忆。

        工作原理：
        1. 将 query 转为向量
        2. 在 Qdrant 中查找与 query 向量最相似的 top_k 个向量
        3. 仅返回 user_id 匹配的结果（用户隔离）

        参数：
            user_id: 用户唯一标识（过滤条件）
            query:   用于语义匹配的查询文本
            top_k:   返回的最相关记忆数量

        返回：
            [{"content": "...", "metadata": {...}}, ...]  按相似度降序排列
        """
        # 构建 Qdrant 过滤器 — 仅检索当前用户的记忆，保证数据隔离
        must_conditions: list[Condition] = [
            FieldCondition(
                key="metadata.user_id",
                match=MatchValue(value=user_id),
            )
        ]
        qdrant_filter = Filter(must=must_conditions)

        try:
            docs = vector_store.similarity_search(
                query=query,
                k=top_k,
                filter=qdrant_filter,
            )
        except Exception as exc:
            logger.warning(
                "记忆语义检索失败 | user_id=%s query_len=%d error=%s",
                user_id,
                len(query),
                exc,
            )
            return []

        results: list[dict[str, Any]] = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
            })

        logger.info(
            "记忆语义检索完成 | user_id=%s query_len=%d top_k=%d hit_count=%d",
            user_id,
            len(query),
            top_k,
            len(results),
        )
        return results

    def get_session_history(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """
        获取指定会话的近期对话历史，按时间顺序排列。

        与 retrieve_relevant 的区别：
        - retrieve_relevant 用语义相似度搜索 → "找相关的内容"
        - get_session_history 精确匹配 session_id → "回顾对话上下文"

        参数：
            session_id: 会话唯一标识
            user_id:    可选的用户 ID 过滤（双重过滤，更安全）
            limit:      最大返回条数

        返回：
            [{"content": "...", "metadata": {...}}, ...]  按时间升序排列
        """
        # 构建过滤条件 — session_id 必须匹配，user_id 可选
        must_conditions: list[Condition] = [
            FieldCondition(
                key="metadata.session_id",
                match=MatchValue(value=session_id),
            )
        ]
        if user_id:
            must_conditions.append(
                FieldCondition(
                    key="metadata.user_id",
                    match=MatchValue(value=user_id),
                )
            )

        qdrant_filter = Filter(must=must_conditions)

        try:
            # 使用语义搜索 + session 过滤获取会话历史
            # 注意：这里用通用查询文本（语义上会匹配各类对话内容）
            docs = vector_store.similarity_search(
                query="对话历史记录",
                k=limit,
                filter=qdrant_filter,
            )
        except Exception as exc:
            logger.warning(
                "会话历史获取失败 | session_id=%s user_id=%s error=%s",
                session_id,
                user_id,
                exc,
            )
            return []

        results: list[dict[str, Any]] = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
            })

        # 按时间戳升序排列 — 保证对话上下文时序正确
        results.sort(
            key=lambda x: x["metadata"].get("timestamp", ""),
        )

        logger.debug(
            "会话历史获取 | session_id=%s count=%d",
            session_id,
            len(results),
        )
        return results

    def delete_user_memories(self, user_id: str) -> int:
        """
        删除指定用户的所有记忆（GDPR "被遗忘权" 合规）。

        参数：
            user_id: 要清除记忆的用户 ID

        返回：
            已删除的记忆条数（0 表示无记忆或删除失败）
        """
        must_conditions: list[Condition] = [
            FieldCondition(
                key="metadata.user_id",
                match=MatchValue(value=user_id),
            )
        ]
        qdrant_filter = Filter(must=must_conditions)

        try:
            # 先统计数量（用于日志）
            count_result = _qdrant_client.count(
                collection_name=vector_store.collection_name,
                count_filter=qdrant_filter,
            )
            total = count_result.count if count_result else 0

            if total == 0:
                logger.info("用户无记忆可删除 | user_id=%s", user_id)
                return 0

            # 执行删除 — points_selector 需封装为 FilterSelector
            _qdrant_client.delete(
                collection_name=vector_store.collection_name,
                points_selector=FilterSelector(filter=qdrant_filter),
            )

            logger.info(
                "用户记忆已全部删除 | user_id=%s deleted_count=%d",
                user_id,
                total,
            )
            return total
        except Exception as exc:
            logger.error(
                "删除用户记忆失败 | user_id=%s error=%s",
                user_id,
                exc,
            )
            return 0


# ==============================================================================
# 格式化工具 — 将检索到的记忆拼接为可供 LLM 阅读的上下文文本
# ==============================================================================


def format_memory_context(
    session_history: list[dict[str, Any]],
    relevant_memories: list[dict[str, Any]],
    max_session_items: int = 10,
    max_relevant_items: int = 5,
) -> str | None:
    """
    将检索到的记忆格式化为 LLM System Prompt 中可用的上下文文本。

    输出格式示例：
        ## 近期对话
        - [2026-06-26 10:30] 用户: 我想挂心内科的号
        - [2026-06-26 10:31] 助手: 好的，正在为您查询...

        ## 相关历史信息
        - 用户对青霉素过敏（记录于 2026-06-20）
        - 用户偏好心内科李医生（记录于 2026-06-15）

    参数：
        session_history:   当前会话的近期对话记录
        relevant_memories: 跨会话的语义相关记忆
        max_session_items: 最多包含的近期对话条数
        max_relevant_items: 最多包含的相关历史条数

    返回：
        格式化后的上下文字符串，无有效内容时返回 None
    """
    parts: list[str] = []

    # --- 近期对话历史 ---
    if session_history:
        recent = session_history[-max_session_items:]  # 取最近 N 条
        lines = ["## 近期对话"]
        for item in recent:
            meta = item.get("metadata", {})
            role = "用户" if meta.get("message_type") == "user" else "助手"
            ts = meta.get("timestamp", "")[:16].replace("T", " ")  # "2026-06-26 10:30"
            content = item.get("content", "")
            # 截断过长内容，避免占用过多 token
            content = content[:200] + "..." if len(content) > 200 else content
            lines.append(f"- [{ts}] {role}: {content}")
        parts.append("\n".join(lines))

    # --- 跨会话相关记忆 ---
    if relevant_memories:
        lines = ["## 相关历史信息"]
        added = set()  # 去重：相同 content 只保留一条
        for item in relevant_memories[:max_relevant_items]:
            content = item.get("content", "").strip()
            if not content or content in added:
                continue
            added.add(content)
            meta = item.get("metadata", {})
            ts = meta.get("timestamp", "")[:10]  # 只取日期 "2026-06-26"
            content = content[:200] + "..." if len(content) > 200 else content
            lines.append(f"- {content}（记录于 {ts}）")
        parts.append("\n".join(lines))

    if not parts:
        return None

    return "\n\n".join(parts)
