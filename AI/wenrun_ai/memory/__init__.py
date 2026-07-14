"""基于 Qdrant 向量库的对话记忆：语义检索历史 + 回存新对话。

模块结构：
- embeddings   Embedding 向量化（httpx 直连 OpenAI 兼容 API）
- store        核心存储（连接管理、Collection 维护、读写）
- retriever    语义检索 + Prompt 格式化 + 重要性加权
- health       启动健康检查
- manager      生命周期管理（去重、TTL 过期清理）
- profile      用户画像（跨会话持久化）
"""

# 向量化
from wenrun_ai.memory.embeddings import embed_documents, embed_query, get_vector_size

# 健康检查
from wenrun_ai.memory.health import check_memory_health

# 生命周期管理
from wenrun_ai.memory.manager import (
    DEDUP_THRESHOLD,
    add_memory_pair_with_dedup,
    add_memory_with_dedup,
    cleanup_expired_memories,
)

# 用户画像
from wenrun_ai.memory.profile import (
    format_profile_for_prompt,
    get_user_profile,
    search_profile,
    upsert_profile,
)

# 检索
from wenrun_ai.memory.retriever import (
    DEFAULT_TOP_K,
    format_memories_for_prompt,
    search_memories,
    search_memories_weighted,
)

# 核心写入
from wenrun_ai.memory.store import add_memory, add_memory_pair

__all__ = [
    # 写入
    "add_memory",
    "add_memory_pair",
    "add_memory_with_dedup",
    "add_memory_pair_with_dedup",
    # 检索
    "search_memories",
    "search_memories_weighted",
    "format_memories_for_prompt",
    "DEFAULT_TOP_K",
    # 健康检查
    "check_memory_health",
    # 生命周期
    "cleanup_expired_memories",
    "DEDUP_THRESHOLD",
    # 向量化
    "embed_query",
    "embed_documents",
    "get_vector_size",
    # 用户画像
    "get_user_profile",
    "search_profile",
    "upsert_profile",
    "format_profile_for_prompt",
]
