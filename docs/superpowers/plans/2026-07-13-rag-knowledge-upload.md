# RAG Dual Knowledge Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an administrator-only Java upload and management API that asynchronously sends supported documents to Python for parsing, embedding, and storage in one of two isolated Qdrant knowledge collections, then bind those collections to the medical and registration intent agents.

**Architecture:** Java owns authentication, local source-file storage, MySQL metadata, status transitions, retry, and deletion orchestration. Python owns parsing, chunking, embeddings, Qdrant ingestion/deletion, retrieval, and three-way intent routing. The API path carries the knowledge-base identifier so a document cannot silently enter the wrong collection.

**Tech Stack:** Java 17, Spring Boot 3.5.6, MyBatis, MySQL, JUnit 5/Mockito/MockMvc, Python 3.10+, FastAPI, LangChain/LangGraph, pypdf, python-docx, Qdrant Client, pytest.

---

## File map

### Java

- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/model/KnowledgeBaseType.java`: URL value and Python/Qdrant mapping.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/model/KnowledgeDocumentStatus.java`: legal lifecycle states.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/entity/AiKnowledgeDocument.java`: MySQL metadata record.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/mapper/AiKnowledgeDocumentMapper.java` and `WenRun/src/main/resources/mapper/AiKnowledgeDocumentMapper.xml`: persistence and filtered paging.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/config/KnowledgeStorageProperties.java` and `KnowledgeTaskConfig.java`: storage limits/path and bounded executor.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/service/KnowledgeFileStorage.java`: safe local storage, digest, read and delete.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/service/KnowledgeDocumentService.java` and `KnowledgeDocumentServiceImpl.java`: authorization-independent business lifecycle.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/service/KnowledgeTaskService.java`: post-commit asynchronous ingest/delete work.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/service/KnowledgeAdminGuard.java`: admin role enforcement.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/client/KnowledgeAiClient.java`: multipart ingest and idempotent delete calls to Python.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/controller/KnowledgeDocumentController.java`: REST API.
- Create `WenRun/src/main/java/com/example/wenrun/ai/knowledge/vo/KnowledgeDocumentVO.java` and `KnowledgeUploadVO.java`: public responses.
- Modify AI/config/error files and `application.yml` for paths, limits, internal authentication, and error mapping.
- Modify `WenRun/docs/SQL/wenrun.sql`; create a focused migration under `WenRun/docs/SQL/`.

### Python

- Create `AI/wenrun_ai/knowledge/types.py`: strict knowledge-base enum and collection mapping.
- Create `AI/wenrun_ai/knowledge/parsers.py`: PDF, DOCX, TXT, Markdown parsers.
- Create `AI/wenrun_ai/knowledge/chunking.py`: paragraph-first, collection-specific chunking.
- Create `AI/wenrun_ai/knowledge/store.py`: collection creation, upsert, delete and query.
- Create `AI/wenrun_ai/knowledge/pipeline.py`: idempotent ingest orchestration.
- Create `AI/wenrun_ai/knowledge/retriever.py`: thresholded Top-K search and prompt formatting.
- Create `AI/wenrun_ai/API/routers/knowledge.py`: internal ingest/delete routes.
- Create `AI/wenrun_ai/chains/router.py`: medical/registration/chat intent classification.
- Modify `AI/wenrun_ai/chains/qa.py`: bind medical RAG, hospital RAG + Tools, and no-RAG chat.
- Modify Python settings, application router registration, package dependencies, and API docs.
- Add focused pytest tests under `AI/tests/`.

## Task 1: Java knowledge contracts and persistence

**Files:** Java model/entity/mapper files, mapper XML, SQL migration and schema.

- [ ] **Step 1: Write failing enum and mapper contract tests**

Create `WenRun/src/test/java/com/example/wenrun/ai/knowledge/model/KnowledgeBaseTypeTest.java` asserting:

```java
assertEquals(KnowledgeBaseType.MEDICAL_GENERAL, KnowledgeBaseType.fromPath("medical-general"));
assertEquals("wenrun_hospital_custom", KnowledgeBaseType.HOSPITAL_CUSTOM.getCollectionName());
assertThrows(BusinessException.class, () -> KnowledgeBaseType.fromPath("other"));
```

Create an H2-backed mapper test with an isolated `src/test/resources/schema-knowledge.sql` that inserts a document, finds it by `(documentId, knowledgeBase)`, counts filtered rows, and detects an active SHA-256 duplicate. Add H2 as a test-scoped dependency so the test never depends on the developer's MySQL instance.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd WenRun && .\mvnw.cmd -Dtest=KnowledgeBaseTypeTest,AiKnowledgeDocumentMapperTest test`

Expected: test compilation fails because knowledge types and mapper do not exist.

- [ ] **Step 3: Add minimal models, mapper, and SQL**

Implement exactly two knowledge bases and these status values:

```java
public enum KnowledgeDocumentStatus {
    PROCESSING, READY, FAILED, DELETING, DELETE_FAILED, DELETED
}
```

The mapper must expose insert, update, scoped select, filtered count/list, duplicate digest lookup, and stale-processing lookup. Add `ai_knowledge_documents` with indexes on document ID, `(knowledge_base, status)`, `(knowledge_base, file_sha256)`, and stale processing time. Add the H2 test dependency and test-only schema/profile used by the mapper test.

- [ ] **Step 4: Run focused and full Java tests**

Run the focused command, then `cd WenRun && .\mvnw.cmd test`.

Expected: all tests pass.

- [ ] **Step 5: Commit only Task 1 files**

```powershell
git add -- WenRun/pom.xml WenRun/src/main/java/com/example/wenrun/ai/knowledge/model WenRun/src/main/java/com/example/wenrun/ai/knowledge/entity WenRun/src/main/java/com/example/wenrun/ai/knowledge/mapper WenRun/src/main/resources/mapper/AiKnowledgeDocumentMapper.xml WenRun/src/test/java/com/example/wenrun/ai/knowledge WenRun/src/test/resources WenRun/docs/SQL
git commit -m "feat: add knowledge document persistence"
```

## Task 2: Safe Java source-file storage

**Files:** `KnowledgeStorageProperties`, `KnowledgeFileStorage`, tests, configuration.

- [ ] **Step 1: Write failing storage tests**

Use `@TempDir` and real files to prove that the service:

```java
StoredKnowledgeFile stored = storage.store(KnowledgeBaseType.MEDICAL_GENERAL, multipartFile);
assertTrue(stored.path().startsWith(tempRoot));
assertEquals(expectedSha256, stored.sha256());
assertFalse(stored.path().getFileName().toString().contains("../"));
```

Add separate tests for empty files, unsupported extensions, MIME mismatch, files above the configured limit, and a malicious filename such as `../../outside.txt`.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd WenRun && .\mvnw.cmd -Dtest=KnowledgeFileStorageTest test`

Expected: failure because storage classes do not exist.

- [ ] **Step 3: Implement minimal secure storage**

Store under `<root>/<knowledge-base>/<UUID>.<extension>`, normalize and verify the resolved path stays under root, stream bytes while computing SHA-256, and delete a partial file on failure. Original names are metadata only.

- [ ] **Step 4: Verify GREEN and full suite**

Run focused tests and `cd WenRun && .\mvnw.cmd test`.

- [ ] **Step 5: Commit Task 2 files**

```powershell
git add -- WenRun/src/main/java/com/example/wenrun/ai/knowledge/config WenRun/src/main/java/com/example/wenrun/ai/knowledge/service/KnowledgeFileStorage.java WenRun/src/test/java/com/example/wenrun/ai/knowledge/service/KnowledgeFileStorageTest.java WenRun/src/main/resources/application.yml
git commit -m "feat: store knowledge source files safely"
```

## Task 3: Java AI client and asynchronous lifecycle

**Files:** knowledge AI client, service, task executor, VO, and unit tests.

- [ ] **Step 1: Write failing client tests**

Use `MockRestServiceServer` or a local stub server to assert `KnowledgeAiClient.ingest(...)` sends multipart fields `file`, `documentId`, `knowledgeBase`, `originalName` and header `X-Api-Key`; assert delete uses the scoped Python URL and treats 404 as idempotent success.

- [ ] **Step 2: Verify client tests fail for missing implementation**

Run: `cd WenRun && .\mvnw.cmd -Dtest=KnowledgeAiClientTest test`.

- [ ] **Step 3: Implement client and properties**

Add `knowledgeIngestPath=/v1/knowledge/ingest` and `knowledgeDeletePath=/v1/knowledge/{knowledgeBase}/{documentId}` to AI properties. Return a typed response containing `documentId`, `knowledgeBase`, and `chunkCount`.

- [ ] **Step 4: Write failing lifecycle tests**

Cover upload status creation, active digest rejection, successful async ingest (`PROCESSING -> READY`), failed ingest (`PROCESSING -> FAILED`), retry, deletion, delete failure, and stale task recovery.

- [ ] **Step 5: Implement lifecycle and bounded executor**

The request transaction stores the source and row before submitting work. The task service re-reads the row, invokes Python, and performs guarded status updates. Keep source files for `FAILED` and `DELETE_FAILED`; remove them only after successful Qdrant deletion.

- [ ] **Step 6: Run focused and full Java tests**

Expected: all lifecycle transitions match the design table and the full suite passes.

- [ ] **Step 7: Commit Task 3 files**

Commit only the client, lifecycle, task configuration, VO, tests, and AI property changes.

## Task 4: Administrator Java REST API

**Files:** controller, admin guard, controller tests, API documentation.

- [ ] **Step 1: Write failing MockMvc tests**

Cover:

```text
POST   /api/ai/knowledge-bases/medical-general/documents
GET    /api/ai/knowledge-bases/medical-general/documents
GET    /api/ai/knowledge-bases/medical-general/documents/{documentId}
POST   /api/ai/knowledge-bases/medical-general/documents/{documentId}/retry
DELETE /api/ai/knowledge-bases/medical-general/documents/{documentId}
```

Assert admin success, non-admin forbidden, invalid knowledge base rejected, and a `hospital-custom` URL cannot access a `medical-general` record.

- [ ] **Step 2: Run controller tests and verify RED**

Run: `cd WenRun && .\mvnw.cmd -Dtest=KnowledgeDocumentControllerTest test`.

- [ ] **Step 3: Implement guard and controller**

The guard reads `UserContext.getUserId()`, loads roles with `SysUserMapper.selectRolesByUserId`, and requires role code `admin`. The controller returns the project `Result<T>` and `PageResult<T>` shapes and never exposes `storagePath`.

- [ ] **Step 4: Run focused/full tests and update API docs**

Document multipart examples for both path values and all management endpoints in `WenRun/docs/API.md`.

- [ ] **Step 5: Commit Task 4 files**

Commit controller, guard, tests, error-handler scope change, and API documentation.

## Task 5: Python parsers and chunking

**Files:** Python dependencies, types, parsers, chunking, fixtures/tests.

- [ ] **Step 1: Add pytest tests before production modules**

Tests must cover enum parsing/collection mapping, UTF-8 TXT/Markdown, generated DOCX, generated text PDF, empty text, invalid DOCX, encrypted/scanned PDF behavior, paragraph-first splitting, per-knowledge-base sizes, overlap, and stable chunk indexes.

Example desired API:

```python
document = parse_document(file_bytes, "guide.docx")
chunks = chunk_document(document.text, KnowledgeBase.HOSPITAL_CUSTOM)
assert chunks[0].index == 0
assert all(chunk.text.strip() for chunk in chunks)
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd AI && python -m pytest tests/knowledge/test_parsers.py tests/knowledge/test_chunking.py -q`.

Expected: import failures for missing knowledge modules.

- [ ] **Step 3: Add dependencies and minimal implementations**

Add explicit `pypdf`, `python-docx`, and `pytest` dependencies. Reject encrypted/no-text PDF and undecodable text with typed `KnowledgeDocumentError`; do not add OCR.

- [ ] **Step 4: Run focused tests and compile**

Run focused pytest and `cd AI && python -m compileall -q wenrun_ai`.

- [ ] **Step 5: Commit Task 5 files**

Commit pyproject, knowledge types/parsers/chunking, and their tests.

## Task 6: Python Qdrant pipeline and internal API

**Files:** store, pipeline, knowledge router, settings/app changes, tests.

- [ ] **Step 1: Write failing store/pipeline tests**

Use an in-memory fake client at the repository boundary. Verify collection mapping, payload fields, batch embeddings, delete-before-retry, partial-write cleanup, idempotent delete, and returned chunk count.

Desired call:

```python
result = ingest_document(
    file_bytes=data,
    file_name="policy.md",
    document_id="doc-1",
    knowledge_base=KnowledgeBase.HOSPITAL_CUSTOM,
)
assert result.chunk_count > 0
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd AI && python -m pytest tests/knowledge/test_pipeline.py -q`.

- [ ] **Step 3: Implement collections, ingestion, and deletion**

Create collections lazily with the detected embedding dimension. Parse and chunk fully, embed in configured batches, then upsert payloads. On any exception delete all points filtered by `document_id` from the selected collection before re-raising.

- [ ] **Step 4: Write failing FastAPI route tests**

Test multipart ingest, invalid API key, invalid knowledge base, invalid file, and idempotent delete. Authentication must use `X-Api-Key` with the configured WenRun internal key.

- [ ] **Step 5: Implement and register routes**

Register under `/v1`; return typed JSON containing `documentId`, `knowledgeBase`, `chunkCount` and a status.

- [ ] **Step 6: Run all Python tests and compile**

Run: `cd AI && python -m pytest -q` and `python -m compileall -q wenrun_ai`.

- [ ] **Step 7: Commit Task 6 files**

Commit store/pipeline/router/settings/app and tests.

## Task 7: Three-intent routing and RAG injection

**Files:** router, retriever, `qa.py`, chain exports, tests.

- [ ] **Step 1: Write failing router/retrieval tests**

Stub only the LLM/embedding/Qdrant boundaries and prove:

```python
assert route_intent("高血压是什么").target == "medical"
assert route_intent("明天怎么去心内科挂号").target == "registration"
assert route_intent("你好呀").target == "chat"
```

Also prove medical searches only `wenrun_medical_general`, registration searches only `wenrun_hospital_custom`, chat performs no retrieval, threshold filtering drops weak hits, and prompt context includes source filenames.

- [ ] **Step 2: Run tests and verify RED**

Run the focused routing and retrieval tests.

- [ ] **Step 3: Implement strict routing and retriever**

Use structured JSON parsing with a safe `chat` fallback. Build three lazy agents: medical has no Tools, registration receives the existing tool list, chat has no Tools. Keep the existing chat request/response and SSE event contracts.

- [ ] **Step 4: Integrate RAG into sync and stream paths**

Both paths must classify once, retrieve at most once, and pass the same knowledge context rules. Registration prompt states that live Tool data overrides static knowledge. Retrieval failures log and degrade without failing the chat endpoint; medical replies without retrieved evidence must not claim a source.

- [ ] **Step 5: Run all Python tests and compile**

Expected: routing isolation tests and pre-existing behavior pass.

- [ ] **Step 6: Commit Task 7 files**

Commit router/retriever/qa tests and implementation only.

## Task 8: Documentation, integration checks, and final verification

**Files:** Java/Python API docs, README/config examples, plan checkbox updates if used.

- [ ] **Step 1: Document operating configuration**

Document Java storage root/max size/executor settings, Python collection names/relevance threshold/embed batch size, accepted formats, internal authentication, curl examples, status polling, retry, deletion, and the explicit lack of OCR/admin UI.

- [ ] **Step 2: Run fresh full verification**

```powershell
Set-Location WenRun
.\mvnw.cmd clean test
Set-Location ..\AI
python -m pytest -q
python -m compileall -q wenrun_ai
```

Expected: Maven build success, all Java/Python tests pass, compileall exits 0.

- [ ] **Step 3: Run diff and requirement audit**

Run `git diff --check`, inspect `git status --short`, and verify every design acceptance criterion has a corresponding passing test. Confirm no React files changed.

- [ ] **Step 4: Simplify recently changed code**

Use the simplify skill, rerun the complete verification commands, and only retain refactors that keep all tests green.

- [ ] **Step 5: Commit documentation and any verified simplification**

Commit only RAG documentation/configuration changes. Do not stage unrelated rename changes.
