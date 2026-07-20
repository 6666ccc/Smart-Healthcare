# Security Boundary Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent unauthorised medical-resource access and isolate every AI request's authenticated context.

**Architecture:** Spring Boot remains the sole user-JWT trust boundary and applies deny-by-default route permissions plus service-layer ownership checks. Java calls FastAPI as an authenticated internal client. FastAPI verifies that client identity before work begins and stores the per-request access token in a `ContextVar`, not shared process memory.

**Tech Stack:** Java 17, Spring Boot, JUnit 5, Mockito, Python 3.11, FastAPI, pytest, httpx, LangGraph.

---

## File structure

- `WenRun/src/main/java/com/example/wenrun/config/AuthInterceptor.java`: complete protected-route policy and deny-by-default.
- `WenRun/src/main/java/com/example/wenrun/ai/client/JavaAiClient.java`: adds the internal API key to Java-to-FastAPI calls.
- `WenRun/src/main/java/com/example/wenrun/service/impl/ChargeServiceImpl.java`: verifies a patient's ownership of a visit before generating charges.
- `WenRun/src/main/java/com/example/wenrun/service/impl/PrescriptionServiceImpl.java`: verifies the prescribing doctor's ownership before cancellation.
- `wenrun-AI/app/api/dependencies.py`: FastAPI service-key verification.
- `wenrun-AI/app/tools/client.py`: a `ContextVar` token scope for Java business tools.
- `wenrun-AI/app/api/routes/java_chat.py`: internal authentication and context scopes for chat and HITL resume.
- New Java and Python tests: authorization, ownership, service-key, and concurrent context-isolation regressions.

### Task 1: Lock down Spring API routing

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/config/AuthInterceptor.java:35-84`
- Test: `WenRun/src/test/java/com/example/wenrun/config/AuthInterceptorTest.java`

- [ ] **Step 1: Write failing tests for missing rules and patient restrictions**

```java
@Test
void patientCannotAccessVisits() {
    var request = request("/api/visits", patientJwt);
    assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("无权限");
}

@Test
void unmappedProtectedPathIsDenied() {
    var request = request("/api/unknown", staffJwt);
    assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("无权限");
}
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `./mvnw -Dtest=AuthInterceptorTest test`

Expected: failure because unmatched paths currently return `null` from `resolveAllowed` and are permitted.

- [ ] **Step 3: Implement complete protected-route policy**

Cover `/api/visits`, `/api/exam-requests`, `/api/depts`, `/api/staff`, `/api/drug-stocks`, `/api/user`, and `/api/ai`. Make unmatched protected paths return an empty allow-list, which `assertAccountTypeAllowed` rejects.

```java
private List<String> resolveAllowed(String path) {
    if (CHARGE_PAY.matcher(path).matches()) return List.of(AccountType.PATIENT);
    return RULES.stream()
        .filter(rule -> path.startsWith(rule.prefix()))
        .findFirst()
        .map(PathRule::allowed)
        .orElse(List.of());
}
```

Restrict departments, staff, drugs, stock, medical items, and schedules to internal users; restrict visits, examinations, prescriptions, and dispensing to staff/internal users. Retain patient registration, own-profile, own-charge and AI chat access.

- [ ] **Step 4: Run focused tests**

Run: `./mvnw -Dtest=AuthInterceptorTest test`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add WenRun/src/main/java/com/example/wenrun/config/AuthInterceptor.java WenRun/src/test/java/com/example/wenrun/config/AuthInterceptorTest.java
git commit -m "fix: deny unlisted protected API routes"
```

### Task 2: Enforce medical-resource ownership

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/service/impl/ChargeServiceImpl.java:79-145`
- Modify: `WenRun/src/main/java/com/example/wenrun/service/impl/PrescriptionServiceImpl.java:113-124`
- Test: `WenRun/src/test/java/com/example/wenrun/service/impl/ChargeServiceImplTest.java`
- Test: `WenRun/src/test/java/com/example/wenrun/service/impl/PrescriptionServiceImplTest.java`

- [ ] **Step 1: Write failing ownership tests**

```java
@Test
void patientCannotCreateChargeForAnotherPatientsVisit() {
    mockPatientAccount(10L, 100L);
    when(visitMapper.selectById(99L)).thenReturn(visitForPatient(200L));

    assertThatThrownBy(() -> service.createFromVisit(99L))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("Access denied");
}

@Test
void doctorCannotCancelAnotherDoctorsPrescription() {
    when(prescriptionMapper.selectById(20L)).thenReturn(prescriptionForVisit(30L));
    when(visitMapper.selectById(30L)).thenReturn(visitForStaff(2L));
    mockCurrentStaff(1L);

    assertThatThrownBy(() -> service.cancel(20L))
        .isInstanceOf(BusinessException.class);
}
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `./mvnw -Dtest=ChargeServiceImplTest,PrescriptionServiceImplTest test`

Expected: both fail because the current methods do not validate ownership.

- [ ] **Step 3: Add minimal service checks**

In `createFromVisit`, immediately after resolving `visit`, compare `visit.getPatientId()` with `currentPatientId()` only for patient accounts. In `cancel`, load the related visit and call `currentStaffSupport.assertOwnsStaff(visit.getStaffId())` before updating status.

```java
private void assertVisitOwnership(OutpatientVisit visit) {
    if (isPatientAccount() && !visit.getPatientId().equals(currentPatientId())) {
        throw new BusinessException("Access denied");
    }
}
```

- [ ] **Step 4: Run focused tests**

Run: `./mvnw -Dtest=ChargeServiceImplTest,PrescriptionServiceImplTest test`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add WenRun/src/main/java/com/example/wenrun/service/impl/ChargeServiceImpl.java WenRun/src/main/java/com/example/wenrun/service/impl/PrescriptionServiceImpl.java WenRun/src/test/java/com/example/wenrun/service/impl/ChargeServiceImplTest.java WenRun/src/test/java/com/example/wenrun/service/impl/PrescriptionServiceImplTest.java
git commit -m "fix: enforce charge and prescription ownership"
```

### Task 3: Authenticate Java-to-FastAPI requests

**Files:**
- Create: `wenrun-AI/app/api/dependencies.py`
- Modify: `wenrun-AI/app/api/routes/java_chat.py:1-170`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/client/JavaAiClient.java:42-58`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/config/AiServiceProperties.java`
- Modify: `WenRun/src/main/resources/application.yml`
- Test: `wenrun-AI/app/tests/test_java_chat_auth.py`

- [ ] **Step 1: Write failing FastAPI route tests**

```python
def test_java_chat_rejects_missing_service_key(client):
    response = client.post("/java/chat", json={"content": "你好"})
    assert response.status_code == 401

def test_java_chat_accepts_configured_service_key(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.java_chat.router_graph.invoke", lambda *args, **kwargs: {})
    response = client.post(
        "/java/chat",
        headers={"X-API-Key": "test-key"},
        json={"content": "你好", "userId": "1"},
    )
    assert response.status_code == 200
```

- [ ] **Step 2: Run test and verify it fails**

Run: `python -m pytest app/tests/test_java_chat_auth.py -q`

Expected: a missing-key request currently reaches the route instead of returning 401.

- [ ] **Step 3: Add a constant-time service-key dependency and apply it to the router**

```python
# app/api/dependencies.py
import hmac
from fastapi import Header, HTTPException, status
from app.core.config import Config

def require_java_service(x_api_key: str | None = Header(default=None)) -> None:
    if not x_api_key or not hmac.compare_digest(x_api_key, Config.JAVA_API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid service key")
```

Attach `dependencies=[Depends(require_java_service)]` to the `/java` router. In `JavaAiClient.postForJavaChatResponse`, add `.header("X-API-Key", properties.getApiKey())`; add `apiKey` to `AiServiceProperties` and bind it from `WENRUN_API_KEY` in `application.yml`.

- [ ] **Step 4: Run FastAPI authentication tests**

Run: `python -m pytest app/tests/test_java_chat_auth.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add wenrun-AI/app/api/dependencies.py wenrun-AI/app/api/routes/java_chat.py wenrun-AI/app/tests/test_java_chat_auth.py WenRun/src/main/java/com/example/wenrun/ai/client/JavaAiClient.java WenRun/src/main/java/com/example/wenrun/ai/config/AiServiceProperties.java WenRun/src/main/resources/application.yml
git commit -m "fix: authenticate Java requests to AI service"
```

### Task 4: Isolate Python request credentials

**Files:**
- Modify: `wenrun-AI/app/tools/client.py:14-57`
- Modify: `wenrun-AI/app/tools/__init__.py:1-82`
- Modify: `wenrun-AI/app/api/routes/java_chat.py:87-170`
- Test: `wenrun-AI/app/tests/test_request_token_context.py`

- [ ] **Step 1: Write failing asynchronous isolation test**

```python
@pytest.mark.asyncio
async def test_parallel_token_scopes_do_not_leak():
    async def read_token(token: str) -> str:
        with patient_token_scope(token):
            await asyncio.sleep(0)
            return resolve_access_token()

    assert await asyncio.gather(read_token("token-a"), read_token("token-b")) == ["token-a", "token-b"]
```

- [ ] **Step 2: Run test and verify it fails**

Run: `python -m pytest app/tests/test_request_token_context.py -q`

Expected: import failure because `patient_token_scope` does not exist.

- [ ] **Step 3: Replace global state with a ContextVar scope**

```python
from contextlib import contextmanager
from contextvars import ContextVar

_patient_access_token: ContextVar[str | None] = ContextVar("patient_access_token", default=None)

@contextmanager
def patient_token_scope(access_token: str | None):
    reset_token = _patient_access_token.set(access_token.strip() if access_token else None)
    try:
        yield
    finally:
        _patient_access_token.reset(reset_token)

def resolve_access_token() -> str:
    token = (_patient_access_token.get() or "").strip()
    if not token:
        raise ValueError("患者未登录，无法调用业务接口")
    return token
```

In both route handlers, replace `set_patient_token(...)`/manual clearing with `with patient_token_scope(access_token):` around graph invocation. Update package exports and remove `set_patient_token` imports.

- [ ] **Step 4: Run new and existing Python tests**

Run: `python -m pytest app/tests -q`

Expected: PASS, including concurrent-scope isolation.

- [ ] **Step 5: Commit**

```powershell
git add wenrun-AI/app/tools/client.py wenrun-AI/app/tools/__init__.py wenrun-AI/app/api/routes/java_chat.py wenrun-AI/app/tests/test_request_token_context.py
git commit -m "fix: isolate AI tool tokens per request"
```

### Task 5: Verify the integrated boundary

**Files:**
- Create: `WenRun/src/test/java/com/example/wenrun/ai/client/JavaAiClientTest.java`
- Modify: `docs/superpowers/specs/2026-07-12-security-boundary-hardening-design.md` only if implementation changes an approved contract.

- [ ] **Step 1: Add Java client request-header test**

```java
@Test
void javaClientSendsInternalApiKey() {
    mockServer.expect(requestTo("http://localhost:8000/java/chat"))
        .andExpect(header("X-API-Key", "test-key"))
        .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

    client.chat(new JavaChatRequestDTO("hello", "1", "session", Map.of()));
}
```

- [ ] **Step 2: Run complete verification**

Run: `./mvnw test`

Expected: all Java tests pass without a live MySQL instance.

Run: `python -m pytest app/tests -q`

Expected: all Python tests pass.

Run: `npm run build`

Expected: Vite production build succeeds. Record current ESLint failures separately unless changed files add new ones.

- [ ] **Step 3: Inspect scope and commit integrated tests**

```powershell
git diff --check
git status --short
git add WenRun/src/test/java/com/example/wenrun/ai/client/JavaAiClientTest.java
git commit -m "test: verify AI service authentication boundary"
```

Do not stage the pre-existing modifications in `wenrun-AI/app/agents/router/nodes.py` or `WenRun/docs/TODO.md`. Because `java_chat.py` is deliberately changed by Tasks 3 and 4, inspect its diff and use `git add -p` to stage only the reviewed security hunks; leave the pre-existing formatting/reordering hunks unstaged.
