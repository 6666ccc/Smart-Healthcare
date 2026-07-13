from wenrun_ai.knowledge.chunking import chunk_document
from wenrun_ai.knowledge.types import KnowledgeBase


def test_uses_smaller_chunks_for_hospital_content():
    text = "医院就诊流程。" * 300

    medical = chunk_document(text, KnowledgeBase.MEDICAL_GENERAL)
    hospital = chunk_document(text, KnowledgeBase.HOSPITAL_CUSTOM)

    assert len(hospital) > len(medical)
    assert max(len(chunk.text) for chunk in medical) <= 800
    assert max(len(chunk.text) for chunk in hospital) <= 500


def test_preserves_paragraphs_before_splitting_long_content():
    text = "第一段很短。\n\n第二段也很短。\n\n" + ("第三段很长。" * 150)

    chunks = chunk_document(text, KnowledgeBase.HOSPITAL_CUSTOM)

    assert chunks[0].text.startswith("第一段很短。\n\n第二段也很短。")
    assert [chunk.index for chunk in chunks] == list(range(len(chunks)))
    assert all(chunk.text.strip() for chunk in chunks)


def test_overlaps_long_chunks():
    text = "".join(str(index % 10) for index in range(1200))

    chunks = chunk_document(text, KnowledgeBase.HOSPITAL_CUSTOM)

    assert chunks[0].text[-80:] == chunks[1].text[:80]
