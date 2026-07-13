from __future__ import annotations

from collections.abc import Callable

from wenrun_ai.memory.embeddings import embed_query
from wenrun_ai.settings import base

from .store import KnowledgeStore
from .types import KnowledgeBase


def retrieve_knowledge_context(
    query: str,
    knowledge_base: KnowledgeBase,
    *,
    store: KnowledgeStore | None = None,
    embedding_fn: Callable[[str], list[float]] | None = None,
    top_k: int | None = None,
    score_threshold: float | None = None,
) -> str | None:
    vector = (embedding_fn or embed_query)(query)
    matches = (store or KnowledgeStore()).search(
        knowledge_base,
        vector,
        top_k=top_k or base.get_knowledge_top_k(),
        score_threshold=(
            base.get_knowledge_score_threshold()
            if score_threshold is None
            else score_threshold
        ),
    )
    if not matches:
        return None

    parts = [f'<knowledge_context knowledge_base="{knowledge_base.value}">']
    for match in matches:
        payload = match.get("payload") or {}
        source = payload.get("original_name") or "未知文档"
        index = payload.get("chunk_index", "?")
        text = str(payload.get("text") or "").strip()
        if text:
            parts.append(f"[来源: {source}；片段: {index}]\n{text}")
    parts.append("</knowledge_context>")
    return "\n\n".join(parts) if len(parts) > 2 else None
