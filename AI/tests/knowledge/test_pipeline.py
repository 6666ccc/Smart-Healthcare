import pytest

from wenrun_ai.knowledge.pipeline import ingest_document
from wenrun_ai.knowledge.types import KnowledgeBase


class FakeStore:
    def __init__(self, fail_on_upsert: int | None = None):
        self.deleted: list[tuple[KnowledgeBase, str]] = []
        self.upserts: list[tuple[KnowledgeBase, list]] = []
        self.fail_on_upsert = fail_on_upsert

    def delete_document(self, knowledge_base: KnowledgeBase, document_id: str) -> None:
        self.deleted.append((knowledge_base, document_id))

    def upsert(self, knowledge_base: KnowledgeBase, points: list) -> None:
        self.upserts.append((knowledge_base, points))
        if self.fail_on_upsert == len(self.upserts):
            raise RuntimeError("qdrant write failed")


def fake_embeddings(texts: list[str]) -> list[list[float]]:
    return [[float(len(text)), 1.0] for text in texts]


def test_ingests_chunks_with_required_metadata_and_stable_ids():
    store = FakeStore()
    content = ("医疗知识。" * 180).encode()

    first = ingest_document(
        file_bytes=content,
        file_name="medical.txt",
        document_id="doc-1",
        knowledge_base=KnowledgeBase.MEDICAL_GENERAL,
        store=store,
        embedding_fn=fake_embeddings,
        batch_size=2,
    )
    first_ids = [point.id for _, batch in store.upserts for point in batch]

    retry_store = FakeStore()
    second = ingest_document(
        file_bytes=content,
        file_name="medical.txt",
        document_id="doc-1",
        knowledge_base=KnowledgeBase.MEDICAL_GENERAL,
        store=retry_store,
        embedding_fn=fake_embeddings,
        batch_size=2,
    )
    second_ids = [point.id for _, batch in retry_store.upserts for point in batch]

    assert first.chunk_count == second.chunk_count == len(first_ids)
    assert first_ids == second_ids
    assert store.deleted[0] == (KnowledgeBase.MEDICAL_GENERAL, "doc-1")
    point = store.upserts[0][1][0]
    assert point.payload["document_id"] == "doc-1"
    assert point.payload["knowledge_base"] == "medical-general"
    assert point.payload["original_name"] == "medical.txt"
    assert point.payload["chunk_index"] == 0
    assert point.payload["text"]
    assert point.payload["content_hash"]


def test_cleans_all_document_points_after_partial_write_failure():
    store = FakeStore(fail_on_upsert=2)
    content = ("医院路线。" * 250).encode()

    with pytest.raises(RuntimeError, match="qdrant write failed"):
        ingest_document(
            file_bytes=content,
            file_name="map.md",
            document_id="doc-2",
            knowledge_base=KnowledgeBase.HOSPITAL_CUSTOM,
            store=store,
            embedding_fn=fake_embeddings,
            batch_size=1,
        )

    assert store.deleted == [
        (KnowledgeBase.HOSPITAL_CUSTOM, "doc-2"),
        (KnowledgeBase.HOSPITAL_CUSTOM, "doc-2"),
    ]
