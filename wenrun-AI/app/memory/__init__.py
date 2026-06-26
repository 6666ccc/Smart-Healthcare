"""
记忆模块 — 基于 Qdrant 向量数据库实现长期记忆的增删查改。

提供：
- MemoryStore: 记忆存储管理器
- 语义检索、会话历史获取、记忆删除

使用示例：
    from app.memory import MemoryStore
    store = MemoryStore()
    store.store_memory(user_id="1001", session_id="sess_001",
                       content="用户消息", message_type="user")
    results = store.retrieve_relevant(user_id="1001", query="相关查询", top_k=5)
"""

from app.memory.memory_store import MemoryStore

__all__ = ["MemoryStore"]
