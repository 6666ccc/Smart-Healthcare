from __future__ import annotations

import secrets

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict

from wenrun_ai.knowledge.parsers import KnowledgeDocumentError
from wenrun_ai.knowledge.pipeline import delete_document, ingest_document
from wenrun_ai.knowledge.types import KnowledgeBase
from wenrun_ai.settings import base

router = APIRouter()


class IngestResponse(BaseModel):
    status: str
    document_id: str
    knowledge_base: str
    chunk_count: int

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda name: {
            "document_id": "documentId",
            "knowledge_base": "knowledgeBase",
            "chunk_count": "chunkCount",
        }.get(name, name),
    )


class DeleteResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda name: {
            "document_id": "documentId",
            "knowledge_base": "knowledgeBase",
        }.get(name, name),
    )

    status: str
    document_id: str
    knowledge_base: str


def _require_internal_key(provided: str | None) -> None:
    expected = base.get_wenrun_api_key()
    if not expected or not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="invalid internal API key")


@router.post("/knowledge/ingest", response_model=IngestResponse, response_model_by_alias=True)
async def ingest_knowledge(
    file: UploadFile = File(...),
    document_id: str = Form(..., alias="documentId"),
    knowledge_base_value: str = Form(..., alias="knowledgeBase"),
    original_name: str = Form(..., alias="originalName"),
    x_api_key: str | None = Header(default=None, alias="X-Api-Key"),
) -> IngestResponse:
    _require_internal_key(x_api_key)
    data = await file.read(base.get_knowledge_max_file_size() + 1)
    if len(data) > base.get_knowledge_max_file_size():
        raise HTTPException(status_code=413, detail="knowledge file is too large")
    try:
        knowledge_base = KnowledgeBase.from_value(knowledge_base_value)
        result = ingest_document(
            file_bytes=data,
            file_name=original_name,
            document_id=document_id,
            knowledge_base=knowledge_base,
        )
    except KnowledgeDocumentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return IngestResponse(
        status="ready",
        document_id=result.document_id,
        knowledge_base=result.knowledge_base.value,
        chunk_count=result.chunk_count,
    )


@router.delete(
    "/knowledge/{knowledge_base_value}/{document_id}",
    response_model=DeleteResponse,
    response_model_by_alias=True,
)
def delete_knowledge(
    knowledge_base_value: str,
    document_id: str,
    x_api_key: str | None = Header(default=None, alias="X-Api-Key"),
) -> DeleteResponse:
    _require_internal_key(x_api_key)
    try:
        knowledge_base = KnowledgeBase.from_value(knowledge_base_value)
    except KnowledgeDocumentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    delete_document(knowledge_base, document_id)
    return DeleteResponse(
        status="deleted",
        document_id=document_id,
        knowledge_base=knowledge_base.value,
    )
