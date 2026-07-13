from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointStruct,
    VectorParams,
)

from wenrun_ai.memory.embeddings import get_vector_size
from wenrun_ai.memory.store import _get_client

from .types import KnowledgeBase


@dataclass(frozen=True)
class KnowledgePoint:
    id: str
    vector: list[float]
    payload: dict[str, Any]


class KnowledgeStore:
    def __init__(self, client=None):
        self._client = client or _get_client()
        self._ensured: set[str] = set()

    def ensure_collection(self, knowledge_base: KnowledgeBase) -> None:
        collection = knowledge_base.collection_name
        if collection in self._ensured:
            return
        existing = {item.name for item in self._client.get_collections().collections}
        if collection not in existing:
            self._client.create_collection(
                collection_name=collection,
                vectors_config=VectorParams(size=get_vector_size(), distance=Distance.COSINE),
            )
        self._ensured.add(collection)

    def upsert(self, knowledge_base: KnowledgeBase, points: list[KnowledgePoint]) -> None:
        self.ensure_collection(knowledge_base)
        self._client.upsert(
            collection_name=knowledge_base.collection_name,
            points=[PointStruct(id=point.id, vector=point.vector, payload=point.payload) for point in points],
            wait=True,
        )

    def delete_document(self, knowledge_base: KnowledgeBase, document_id: str) -> None:
        collection = knowledge_base.collection_name
        existing = {item.name for item in self._client.get_collections().collections}
        if collection not in existing:
            return
        self._client.delete(
            collection_name=collection,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id),
                        )
                    ]
                )
            ),
            wait=True,
        )
