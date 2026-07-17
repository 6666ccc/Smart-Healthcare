# End-to-End HITL Implementation Plan

**Goal:** Complete the human-in-the-loop flow across Python LangGraph, the WenRun Java gateway, and the React assistant so protected business writes pause before execution and resume only after an authenticated user decision.

**Architecture:** Keep the existing LangGraph workflow and in-memory checkpoint. Python owns the pending action and validates decisions against the checkpoint; Java rebuilds identity from the login token and only persists completed assistant replies; React renders pending actions and sends the normalized decision contract.

**Tech Stack:** Python 3.10+, FastAPI, LangGraph, pytest; Java Spring Boot, RestClient, Jackson, JUnit/Mockito; React 19, Vite, ESLint.

---

## File map

- Python: `AI/wenrun_ai/graph/hitl.py`, `AI/wenrun_ai/graph/nodes.py`, `AI/wenrun_ai/graph/workflow.py`, `AI/wenrun_ai/API/routers/chat.py`, and graph/API tests.
- Java: `WenRun/src/main/java/com/example/wenrun/ai/dto/ChatResumeRequestDTO.java`, `.../vo/ChatResponseVO.java`, `.../vo/ChatExecutionVO.java`, `.../vo/ChatStreamEventVO.java`, `.../client/AiServiceClient.java`, `.../controller/AiChatController.java`, plus AI tests.
- React: `React/src/api/modules/ai.js`, `React/src/views/Assistant/index.jsx`, and assistant/API tests if the existing test harness supports them.

### Task 1: Establish Python protocol and workflow coverage

**Files:**
- Modify: `AI/wenrun_ai/graph/hitl.py`
- Modify: `AI/wenrun_ai/graph/nodes.py`
- Modify: `AI/wenrun_ai/graph/workflow.py`
- Test: `AI/tests/graph/test_hitl.py`, `AI/tests/graph/test_workflow.py`, `AI/tests/API/test_chat_routes.py`

- [ ] Add tests for the exact `decision` payloads `approve`, `edit` with object args, and `reject` with a non-empty message; assert legacy `action` payloads are rejected.
- [ ] Add workflow tests that a protected action returns a formatted pending interrupt, approve resumes the same thread, edit forwards `edited_action`, reject forwards the rejection message, and a second resume after completion raises `LookupError`.
- [ ] Add tests for multiple pending actions requiring the same number of decisions and for user-scoped thread isolation.
- [ ] Normalize middleware action requests into one stable interrupt shape without trusting client-provided tool names or allowed decisions.
- [ ] Ensure resume validates the checkpoint's pending interrupt list before constructing `Command(resume=...)`, preserves the trusted state, and stores memory only on completed execution.
- [ ] Run `pytest -q tests/graph tests/API/test_chat_routes.py` from `AI` and fix only failures caused by the HITL contract.

### Task 2: Complete Python HTTP and SSE behavior

**Files:**
- Modify: `AI/wenrun_ai/API/routers/chat.py`
- Modify: `AI/wenrun_ai/API/schemas.py`
- Test: `AI/tests/API/test_chat_routes.py`

- [ ] Verify `/v1/chat` accepts a pending execution with `reply=null` and serializes `conversationId` and `interrupts` unchanged.
- [ ] Verify `/v1/chat/resume` forwards the authenticated `userId` and internal API key to the workflow and maps missing checkpoints to a client error without exposing exception text.
- [ ] Verify `/v1/chat/stream` emits exactly one `interrupt` event for pending execution and never emits `done`; completed execution emits `done`.
- [ ] Keep all existing request aliases (`apiKey`, `conversationId`, `userId`) working.
- [ ] Run the complete Python suite with `pytest -q` from `AI`.

### Task 3: Make Java DTOs and client represent pending execution

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/vo/ChatResponseVO.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/vo/ChatExecutionVO.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/vo/ChatStreamEventVO.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/dto/ChatResumeRequestDTO.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/client/AiServiceClient.java`
- Test: `WenRun/src/test/java/com/example/wenrun/ai/service/AiChatServiceImplTest.java`

- [ ] Ensure the normal chat response can carry `status`, `conversationId`, and `interrupts` while remaining compatible with callers that only read `reply`.
- [ ] Ensure Jackson maps `allowedDecisions`, `details`, `summary`, and arbitrary `args` maps in both normal and SSE responses.
- [ ] Make the resume client send `decision` unchanged under `/v1/chat/resume`, accept either completed or pending responses, and preserve useful HTTP status categories in `AiServiceException`.
- [ ] Add client/service tests for pending response deserialization and resume request forwarding.

### Task 4: Secure Java controller and persistence semantics

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/controller/AiChatController.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/service/serviceImpl/AiChatServiceImpl.java` only if required by the client contract
- Test: `WenRun/src/test/java/com/example/wenrun/ai/controller/AiChatControllerTest.java`, `WenRun/src/test/java/com/example/wenrun/ai/service/AiChatServiceImplTest.java`

- [ ] Keep the initial user message persistence behavior, but persist an assistant message only when the initial response is completed and has non-empty reply.
- [ ] Add/retain `POST /api/ai/chat/resume`; clear all caller-supplied identity fields and repopulate them from the authenticated token before calling Python.
- [ ] Persist the assistant reply only for a completed resume; never persist pending or empty replies.
- [ ] Forward SSE `interrupt` events, close the emitter after pending, and avoid emitting a synthetic done event or saving an empty assistant message.
- [ ] Add controller tests for pending initial chat, completed initial chat, pending resume, completed resume, forged identity fields, and SSE interrupt forwarding.
- [ ] Run `./mvnw test` from `WenRun`.

### Task 5: Align React decision payload and interaction state

**Files:**
- Modify: `React/src/api/modules/ai.js`
- Modify: `React/src/views/Assistant/index.jsx`
- Modify: `React/src/views/shared/views.css` only if the card needs existing-style rules

- [ ] Change resume payloads from `{action, interruptId, args}` to the Python contract `{decision: "approve"}`, `{decision: "edit", args}`, or `{decision: "reject", message}`.
- [ ] Require a non-empty rejection reason in the confirmation card and keep JSON object validation for edit.
- [ ] Track a local submitting state per interrupt so buttons cannot issue duplicate resumes; restore the card to actionable state if the request fails.
- [ ] Handle completed resume by appending the final reply, pending resume by appending every returned interrupt, and empty replies without creating a phantom assistant message.
- [ ] Keep PC/mobile rendering and current authenticated request behavior intact.

### Task 6: Verify the integrated path

**Files:**
- Test/update only the focused files above as needed.

- [ ] Run Python tests, Java tests, and React lint/build independently.
- [ ] Inspect `git diff` and `git status` to ensure unrelated pre-existing deletions and modifications remain untouched.
- [ ] Run `git diff --check` for changed text files.
- [ ] Verify the final contract manually with a mocked protected action: initial pending, approve completion, edit completion, reject completion, and a second resume rejection.
