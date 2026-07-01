import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from qdrant_client.models import Condition, FieldCondition, Filter, FilterSelector, MatchValue

from app.memory.client import QDRANT_COLLECTION, _qdrant_client, get_vector_store

logger = logging.getLogger(__name__)


class MemoryStore:
    def store_memory(
        self,
        user_id: str,
        session_id: str,
        content: str,
        message_type: str = "user",
        intent: str = "chat",
        memory_type: str = "conversation",
    ) -> str | None:
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
            store = get_vector_store()
            if store is None:
                return None
            store.add_texts(texts=[content], metadatas=[metadata])
            return memory_id
        except Exception as exc:
            logger.error("记忆存储失败 | user_id=%s error=%s", user_id, exc)
            return None

    def retrieve_relevant(self, user_id: str, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        qdrant_filter = Filter(must=[
            FieldCondition(key="metadata.user_id", match=MatchValue(value=user_id)),
        ])

        try:
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
        if not session_id:
            return []

        conditions: list[Condition] = [
            FieldCondition(key="metadata.session_id", match=MatchValue(value=session_id)),
        ]
        if user_id:
            conditions.append(
                FieldCondition(key="metadata.user_id", match=MatchValue(value=user_id)),
            )

        try:
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
    parts = []

    if session_history:
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
