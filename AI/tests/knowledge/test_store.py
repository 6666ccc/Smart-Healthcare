from qdrant_client import QdrantClient

from wenrun_ai.knowledge.store import KnowledgePoint, KnowledgeStore
from wenrun_ai.knowledge.types import KnowledgeBase


def test_store_upsert_search_and_scoped_delete(monkeypatch):
    monkeypatch.setattr("wenrun_ai.knowledge.store.get_vector_size", lambda: 2)
    store = KnowledgeStore(QdrantClient(":memory:"))
    point = KnowledgePoint(
        id="55b6ea8c-6809-4bea-b044-f26b6bf3a4ce",
        vector=[1.0, 0.0],
        payload={
            "document_id": "doc-1",
            "original_name": "guide.txt",
            "chunk_index": 0,
            "text": "门诊位于一楼。",
        },
    )

    store.upsert(KnowledgeBase.HOSPITAL_CUSTOM, [point])
    matches = store.search(
        KnowledgeBase.HOSPITAL_CUSTOM,
        [1.0, 0.0],
        top_k=3,
        score_threshold=0.5,
    )
    assert matches[0]["payload"]["document_id"] == "doc-1"

    store.delete_document(KnowledgeBase.HOSPITAL_CUSTOM, "doc-1")
    assert (
        store.search(
            KnowledgeBase.HOSPITAL_CUSTOM,
            [1.0, 0.0],
            top_k=3,
            score_threshold=0.5,
        )
        == []
    )
