from __future__ import annotations

from enum import Enum


class KnowledgeDocumentError(ValueError):
    """A document or knowledge-base value cannot be safely processed."""


class KnowledgeBase(str, Enum):
    MEDICAL_GENERAL = "medical-general"
    HOSPITAL_CUSTOM = "hospital-custom"

    @property
    def collection_name(self) -> str:
        if self is KnowledgeBase.MEDICAL_GENERAL:
            return "wenrun_medical_general"
        return "wenrun_hospital_custom"

    @classmethod
    def from_value(cls, value: str) -> "KnowledgeBase":
        try:
            return cls(value)
        except (TypeError, ValueError) as exc:
            raise KnowledgeDocumentError(f"不支持的知识库类型: {value}") from exc
