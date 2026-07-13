from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from wenrun_ai.memory.embeddings import embed_documents
from wenrun_ai.settings import base

from .chunking import chunk_document
from .parsers import parse_document
from .store import KnowledgePoint, KnowledgeStore
from .types import KnowledgeBase


@dataclass(frozen=True)
class IngestResult:
    document_id: str
    knowledge_base: KnowledgeBase
    chunk_count: int


def ingest_document(
    *,
    file_bytes: bytes,
    file_name: str,
    document_id: str,
    knowledge_base: KnowledgeBase,
    store: KnowledgeStore | None = None,
    embedding_fn: Callable[[list[str]], list[list[float]]] | None = None,
    batch_size: int | None = None,
) -> IngestResult:
    target_store = store or KnowledgeStore()
    embed = embedding_fn or embed_documents
    size = batch_size or base.get_knowledge_embedding_batch_size()
    if size < 1:
        raise ValueError("Embedding batch size must be positive")

    parsed = parse_document(file_bytes, file_name)
    chunks = chunk_document(parsed.text, knowledge_base)
    target_store.delete_document(knowledge_base, document_id)

    try:
        for start in range(0, len(chunks), size):
            batch = chunks[start : start + size]
            vectors = embed([chunk.text for chunk in batch])
            if len(vectors) != len(batch):
                raise RuntimeError("Embedding 返回数量与切片数量不一致")
            points = [
                _point(document_id, knowledge_base, file_name, chunk.index, chunk.text, vector)
                for chunk, vector in zip(batch, vectors)
            ]
            target_store.upsert(knowledge_base, points)
    except Exception:
        target_store.delete_document(knowledge_base, document_id)
        raise

    return IngestResult(
        document_id=document_id,
        knowledge_base=knowledge_base,
        chunk_count=len(chunks),
    )


def delete_document(
    knowledge_base: KnowledgeBase,
    document_id: str,
    *,
    store: KnowledgeStore | None = None,
) -> None:
    (store or KnowledgeStore()).delete_document(knowledge_base, document_id)


def _point(
    document_id: str,
    knowledge_base: KnowledgeBase,
    file_name: str,
    chunk_index: int,
    text: str,
    vector: list[float],
) -> KnowledgePoint:
    point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"wenrun:{document_id}:{chunk_index}"))
    return KnowledgePoint(
        id=point_id,
        vector=vector,
        payload={
            "document_id": document_id,
            "knowledge_base": knowledge_base.value,
            "original_name": file_name,
            "chunk_index": chunk_index,
            "text": text,
            "content_hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        },
    )
