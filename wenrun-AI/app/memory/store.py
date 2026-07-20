import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from qdrant_client.models import Condition, FieldCondition, Filter, FilterSelector, MatchValue

from app.memory.client import QDRANT_COLLECTION, _qdrant_client, get_vector_store

logger = logging.getLogger(__name__)


class MemoryStore:
    """封装对 Qdrant 记忆集合的读写操作。

    输入来源：路由图节点传入 user_id、session_id、用户输入和助手回复。
    处理方式：写入时把文本转成向量并附带 metadata；读取时用 metadata filter 做用户/会话隔离。
    输出用途：retrieve_memory 节点把这些记录格式化进 prompt，帮助模型理解上下文。
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
        """把一条对话消息写入向量库。

        输入：用户、会话、消息内容、消息角色、意图和记忆类型。
        处理：生成 memory_id 和 metadata，再调用 QdrantVectorStore.add_texts 写入文本向量。
        输出：写入成功返回 memory_id；向量库不可用或写入失败时返回 None。
        """
        # 第 1 步：metadata 是后续按用户、会话、角色过滤和排序的依据。
        memory_id = str(uuid.uuid4())
        metadata = {
            "memory_id": memory_id,
            "user_id": user_id,
            "session_id": session_id,
            "message_type": message_type,
            "intent": intent,
            "memory_type": memory_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            # 第 2 步：get_vector_store 可能因为 Qdrant 或 embedding 不可用返回 None。
            store = get_vector_store()
            if store is None:
                return None
            store.add_texts(texts=[content], metadatas=[metadata])
            return memory_id
        except Exception as exc:
            logger.error("记忆存储失败 | user_id=%s error=%s", user_id, exc)
            return None

    def retrieve_relevant(self, user_id: str, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """按用户问题检索相关历史记忆。

        输入：user_id 用于隔离当前用户；query 是本轮用户输入；top_k 控制返回条数。
        处理：用 metadata.user_id 构造 Qdrant filter，再做向量相似度检索。
        输出：[{"content": 文本, "metadata": 元数据}, ...]；失败时返回空列表。
        """
        # 第 1 步：所有记忆检索都必须带 user_id 过滤，避免跨用户泄露历史信息。
        qdrant_filter = Filter(must=[
            FieldCondition(key="metadata.user_id", match=MatchValue(value=user_id)),
        ])

        try:
            # 第 2 步：similarity_search 会把 query 转向量，再在 Qdrant 中找语义相近记录。
            store = get_vector_store()
            if store is None:
                return []
            docs = store.similarity_search(query=query, k=top_k, filter=qdrant_filter)
        except Exception as exc:
            logger.warning("记忆检索失败 | user_id=%s error=%s", user_id, exc)
            return []

        return [{"content": doc.page_content, "metadata": doc.metadata} for doc in docs]

    def get_session_history(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """按 session_id 拉取同一会话的历史消息。

        输入：session_id 是会话标识；user_id 可选，用于进一步限制同一用户；limit 控制最多返回点数。
        处理：直接 scroll Qdrant payload，不做相似度排序；最后按 metadata.timestamp 升序排列。
        输出：[{"content": 文本, "metadata": 元数据}, ...]；没有 session_id 或失败时返回空列表。
        """
        if not session_id:
            return []

        # 第 1 步：至少按 session_id 过滤；传入 user_id 时再加用户隔离条件。
        conditions: list[Condition] = [
            FieldCondition(key="metadata.session_id", match=MatchValue(value=session_id)),
        ]
        if user_id:
            conditions.append(
                FieldCondition(key="metadata.user_id", match=MatchValue(value=user_id)),
            )

        try:
            # 第 2 步：scroll 读取原始 payload，适合按条件拉历史，不需要向量相似计算。
            store = get_vector_store()
            if store is None:
                return []
            collection = store.collection_name or QDRANT_COLLECTION
            points, _ = _qdrant_client.scroll(
                collection_name=collection,
                scroll_filter=Filter(must=conditions),
                limit=limit,
                with_payload=True,
                with_vectors=False,
            )
        except Exception as exc:
            logger.warning("会话历史获取失败 | session_id=%s error=%s", session_id, exc)
            return []

        # 第 3 步：把 Qdrant point.payload 转成项目统一使用的 content + metadata 结构。
        results = []
        for point in points:
            payload = point.payload or {}
            results.append({
                "content": payload.get("page_content", ""),
                "metadata": payload.get("metadata", {}),
            })

        results.sort(key=lambda x: x["metadata"].get("timestamp", ""))
        return results

    def delete_user_memories(self, user_id: str) -> int:
        """删除某个用户的全部记忆。

        输入：user_id。
        处理：先 count 得到将删除的数量，再用同一个 filter 删除匹配 points。
        输出：实际删除前统计到的条数；失败时返回 0。
        """
        qdrant_filter = Filter(must=[
            FieldCondition(key="metadata.user_id", match=MatchValue(value=user_id)),
        ])

        try:
            store = get_vector_store()
            if store is None:
                return 0
            collection = store.collection_name or QDRANT_COLLECTION

            count_result = _qdrant_client.count(collection_name=collection, count_filter=qdrant_filter)
            total = count_result.count if count_result else 0
            if total == 0:
                return 0

            _qdrant_client.delete(
                collection_name=collection,
                points_selector=FilterSelector(filter=qdrant_filter),
            )
            return total
        except Exception as exc:
            logger.error("删除用户记忆失败 | user_id=%s error=%s", user_id, exc)
            return 0


def format_memory_context(
    session_history: list[dict[str, Any]],
    relevant_memories: list[dict[str, Any]],
    max_session_items: int = 10,
    max_relevant_items: int = 5,
) -> str | None:
    """把会话历史和相关记忆拼成可注入 prompt 的上下文文本。

    输入：
    - session_history：同一 session 的最近对话，强调“刚才聊到哪里”。
    - relevant_memories：向量检索出的跨会话相关内容，强调“历史上相关信息”。

    处理：分别生成“近期对话”和“相关历史信息”两个 markdown 小节，并限制条数和长度。
    输出：可拼进 system prompt 的字符串；两类记忆都为空时返回 None。
    """
    parts = []

    if session_history:
        # 第 1 步：保留最近若干条同会话消息，按角色显示成可读对话线索。
        lines = ["## 近期对话"]
        for item in session_history[-max_session_items:]:
            meta = item.get("metadata", {})
            role = "用户" if meta.get("message_type") == "user" else "助手"
            ts = meta.get("timestamp", "")[:16].replace("T", " ")
            content = item.get("content", "")
            if len(content) > 200:
                content = content[:200] + "..."
            lines.append(f"- [{ts}] {role}: {content}")
        parts.append("\n".join(lines))

    if relevant_memories:
        # 第 2 步：加入语义相关的历史信息，并用 added 去重，避免 prompt 重复膨胀。
        lines = ["## 相关历史信息"]
        added = set()
        for item in relevant_memories[:max_relevant_items]:
            content = item.get("content", "").strip()
            if not content or content in added:
                continue
            added.add(content)
            ts = item.get("metadata", {}).get("timestamp", "")[:10]
            if len(content) > 200:
                content = content[:200] + "..."
            lines.append(f"- {content}（记录于 {ts}）")
        if len(lines) > 1:
            parts.append("\n".join(lines))

    if not parts:
        return None
    return "\n\n".join(parts)
