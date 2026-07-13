from __future__ import annotations

from dataclasses import dataclass

from .types import KnowledgeBase, KnowledgeDocumentError


@dataclass(frozen=True)
class KnowledgeChunk:
    index: int
    text: str


_CHUNK_CONFIG = {
    KnowledgeBase.MEDICAL_GENERAL: (800, 120),
    KnowledgeBase.HOSPITAL_CUSTOM: (500, 80),
}


def chunk_document(text: str, knowledge_base: KnowledgeBase) -> list[KnowledgeChunk]:
    normalized = text.strip()
    if not normalized:
        raise KnowledgeDocumentError("文档没有可切分的文本")

    size, overlap = _CHUNK_CONFIG[knowledge_base]
    raw_chunks: list[str] = []
    buffered: list[str] = []

    for paragraph in _paragraphs(normalized):
        if len(paragraph) > size:
            _flush(buffered, raw_chunks)
            raw_chunks.extend(_split_long(paragraph, size, overlap))
            continue

        candidate = "\n\n".join([*buffered, paragraph])
        if buffered and len(candidate) > size:
            _flush(buffered, raw_chunks)
        buffered.append(paragraph)

    _flush(buffered, raw_chunks)
    return [KnowledgeChunk(index=index, text=chunk) for index, chunk in enumerate(raw_chunks)]


def _paragraphs(text: str) -> list[str]:
    return [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]


def _flush(buffered: list[str], chunks: list[str]) -> None:
    if buffered:
        chunks.append("\n\n".join(buffered))
        buffered.clear()


def _split_long(text: str, size: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = end - overlap
    return chunks
