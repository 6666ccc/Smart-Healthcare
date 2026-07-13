from wenrun_ai.knowledge.retriever import retrieve_knowledge_context
from wenrun_ai.knowledge.types import KnowledgeBase


class FakeStore:
    def __init__(self):
        self.calls = []

    def search(self, knowledge_base, vector, *, top_k, score_threshold):
        self.calls.append((knowledge_base, vector, top_k, score_threshold))
        return [
            {
                "score": 0.91,
                "payload": {
                    "original_name": "高血压指南.pdf",
                    "chunk_index": 2,
                    "text": "高血压患者应规律监测血压。",
                },
            }
        ]


def test_retrieve_knowledge_context_uses_selected_knowledge_base():
    store = FakeStore()

    context = retrieve_knowledge_context(
        "高血压要注意什么",
        KnowledgeBase.MEDICAL_GENERAL,
        store=store,
        embedding_fn=lambda _: [0.1, 0.2],
        top_k=3,
        score_threshold=0.5,
    )

    assert store.calls == [
        (KnowledgeBase.MEDICAL_GENERAL, [0.1, 0.2], 3, 0.5)
    ]
    assert "<knowledge_context" in context
    assert 'knowledge_base="medical-general"' in context
    assert "高血压指南.pdf" in context
    assert "高血压患者应规律监测血压" in context


def test_retrieve_knowledge_context_returns_none_when_no_match():
    store = FakeStore()
    store.search = lambda *args, **kwargs: []

    assert (
        retrieve_knowledge_context(
            "你好",
            KnowledgeBase.HOSPITAL_CUSTOM,
            store=store,
            embedding_fn=lambda _: [0.1],
        )
        is None
    )
