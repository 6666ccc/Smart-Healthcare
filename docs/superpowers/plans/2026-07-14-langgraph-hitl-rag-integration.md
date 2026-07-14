# LangGraph、HITL 与 RAG 整合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前 AI、WenRun 与 React 主项目中实现由 LangGraph 编排、RAG 增强且可端到端恢复的人工确认工作流，并清理旧 worktree。

**Architecture:** `wenrun_ai.graph` 负责状态、节点、HITL 决策和 LangGraph 工作流；现有 `chains` 只保留模型、提示词与兼容入口。FastAPI 以统一结果和 SSE interrupt 事件暴露图状态，WenRun 原样注入认证上下文并代理恢复请求，React 在流式消息中展示并提交操作确认。

**Tech Stack:** Python 3.10、FastAPI、LangChain、LangGraph、pytest、Spring Boot、Jackson、React、Vite、ESLint。

---

## 文件结构

- Create: `AI/wenrun_ai/graph/__init__.py` — 工作流公开入口。
- Create: `AI/wenrun_ai/graph/state.py` — 图状态和完成/暂停结果。
- Create: `AI/wenrun_ai/graph/hitl.py` — 写工具白名单、决策验证和前端载荷。
- Create: `AI/wenrun_ai/graph/nodes.py` — 记忆、路由、RAG、Agent、HITL、存储节点。
- Create: `AI/wenrun_ai/graph/workflow.py` — `StateGraph` 构建、执行、恢复和事件转换。
- Modify: `AI/wenrun_ai/chains/qa.py` — 保留 Agent 构建，公开入口转发到 graph。
- Modify: `AI/wenrun_ai/API/schemas.py` — 聊天/恢复统一响应模型。
- Modify: `AI/wenrun_ai/API/routers/chat.py` — 普通聊天、SSE interrupt 与 resume 路由。
- Create: `AI/tests/graph/test_hitl.py` — 决策与格式化测试。
- Create: `AI/tests/graph/test_workflow.py` — RAG 路由、暂停、恢复、会话隔离测试。
- Modify: `AI/tests/chains/test_qa_routing.py` — 兼容入口委派测试。
- Create: `AI/tests/API/test_chat_routes.py` — FastAPI 契约测试。
- Create: `WenRun/src/main/java/com/example/wenrun/ai/dto/ChatResumeRequestDTO.java`。
- Create: `WenRun/src/main/java/com/example/wenrun/ai/vo/ChatExecutionVO.java`。
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/client/AiServiceClient.java`。
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/service/AiChatService.java`。
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/service/serviceImpl/AiChatServiceImpl.java`。
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/controller/AiChatController.java`。
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/vo/ChatStreamEventVO.java`。
- Modify: `React/src/api/modules/ai.js` — 解析 interrupt 与恢复请求。
- Modify: `React/src/views/Assistant/index.jsx` — 确认卡片与恢复状态。

### Task 1: 定义 HITL 边界和可测试的载荷

**Files:**
- Create: `AI/tests/graph/test_hitl.py`
- Create: `AI/wenrun_ai/graph/__init__.py`
- Create: `AI/wenrun_ai/graph/hitl.py`

- [ ] **Step 1: 编写失败测试，锁定写工具与拒绝非法决策。**

```python
from wenrun_ai.graph.hitl import format_interrupt, normalize_decision, WRITE_TOOL_POLICIES

def test_write_tools_require_explicit_confirmation():
    assert set(WRITE_TOOL_POLICIES) == {"create_patient", "create_registration", "cancel_registration", "start_visit", "update_visit", "create_exam_request", "create_prescription", "cancel_prescription", "create_charge_from_visit", "pay_charge", "dispense_prescription"}
    payload = format_interrupt("pay_charge", {"charge_id": 3, "paid_amount": 10})
    assert payload["tool"] == "pay_charge"
    assert payload["allowedDecisions"] == ["approve", "edit", "reject"]

def test_decision_rejects_unapproved_action():
    assert normalize_decision({"type": "reject", "message": "金额不对"}, "pay_charge") == {"decisions": [{"type": "reject", "message": "金额不对"}]}
```

- [ ] **Step 2: 运行测试确认因模块不存在而失败。**

Run: `python -m pytest AI/tests/graph/test_hitl.py -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'wenrun_ai.graph'`.

- [ ] **Step 3: 实现最小 HITL 策略与决策转换。**

```python
WRITE_TOOL_POLICIES = {name: {"allowed_decisions": ["approve", "edit", "reject"]} for name in WRITE_TOOL_NAMES}

def normalize_decision(decision: dict, tool_name: str) -> dict:
    kind = str(decision.get("type") or "approve")
    if kind not in WRITE_TOOL_POLICIES[tool_name]["allowed_decisions"]:
        raise ValueError("不支持的确认决策")
    item = {"type": kind}
    if kind == "edit": item["edited_action"] = {"name": tool_name, "args": dict(decision.get("args") or {})}
    if kind == "reject" and decision.get("message"): item["message"] = str(decision["message"])
    return {"decisions": [item]}
```

- [ ] **Step 4: 运行测试确认通过。**

Run: `python -m pytest AI/tests/graph/test_hitl.py -v`

Expected: PASS.

### Task 2: 以 LangGraph 编排当前 RAG、记忆与 Agent

**Files:**
- Create: `AI/tests/graph/test_workflow.py`
- Create: `AI/wenrun_ai/graph/state.py`
- Create: `AI/wenrun_ai/graph/nodes.py`
- Create: `AI/wenrun_ai/graph/workflow.py`
- Modify: `AI/wenrun_ai/chains/qa.py`

- [ ] **Step 1: 编写失败测试，验证 medical 走医疗库、registration 走院内库，chat 不检索。**

```python
def test_graph_injects_selected_knowledge_and_returns_reply():
    graph = ChatWorkflow(route=lambda _: medical_route, retrieve=lambda q, base: f"<{base.value}>", agent=lambda *_: "回答")
    result = graph.invoke(ChatInput(message="高血压", conversation_id="a"))
    assert result.status == "completed"
    assert result.reply == "回答"
    assert graph.retrieved_bases == [KnowledgeBase.MEDICAL_GENERAL]
```

- [ ] **Step 2: 运行测试确认因 `ChatWorkflow` 不存在而失败。**

Run: `python -m pytest AI/tests/graph/test_workflow.py -v`

Expected: FAIL with import or attribute error for `ChatWorkflow`.

- [ ] **Step 3: 实现状态、节点和图。**

```python
builder = StateGraph(ChatState)
builder.add_node("retrieve_memory", retrieve_memory)
builder.add_node("route", route)
builder.add_node("retrieve_knowledge", retrieve_knowledge)
builder.add_node("run_agent", run_agent)
builder.add_node("pause_for_confirmation", pause_for_confirmation)
builder.add_node("store_memory", store_memory)
builder.add_edge(START, "retrieve_memory")
builder.add_edge("retrieve_memory", "route")
builder.add_edge("route", "retrieve_knowledge")
builder.add_edge("retrieve_knowledge", "run_agent")
builder.add_conditional_edges("run_agent", next_after_agent, {"pause_for_confirmation": "pause_for_confirmation", "store_memory": "store_memory"})
builder.add_edge("pause_for_confirmation", "store_memory")
builder.add_edge("store_memory", END)
```

`run_agent` 必须调用 `chains.qa` 的现有提示词、模型和 Agent 工厂；`retrieve_knowledge` 必须用 `knowledge_base_for_intent` 和 `retrieve_knowledge_context`；RAG 或记忆异常只记录警告且返回空上下文。

- [ ] **Step 4: 补充暂停、批准、拒绝和跨会话隔离的失败测试。**

```python
def test_write_action_pauses_then_resume_approves_same_thread():
    result = graph.invoke(ChatInput(message="帮我缴费", conversation_id="thread-a"))
    assert result.status == "pending"
    resumed = graph.resume("thread-a", {"type": "approve"})
    assert resumed.status == "completed"

def test_resume_cannot_use_another_conversation_checkpoint():
    graph.invoke(ChatInput(message="帮我缴费", conversation_id="thread-a"))
    with pytest.raises(LookupError):
        graph.resume("thread-b", {"type": "approve"})
```

- [ ] **Step 5: 实现 checkpoint、`interrupt()` 恢复和结果转换。**

```python
class ChatWorkflow:
    def invoke(self, request: ChatInput) -> ChatExecution:
        state = self.graph.invoke(initial_state(request), config=thread_config(request.conversation_id))
        return execution_from_state(state, request.conversation_id)

    def resume(self, conversation_id: str, decision: dict) -> ChatExecution:
        if not self.checkpointer.get_tuple(thread_config(conversation_id)):
            raise LookupError("未找到待确认会话")
        state = self.graph.invoke(Command(resume=decision), config=thread_config(conversation_id))
        return execution_from_state(state, conversation_id)
```

- [ ] **Step 6: 运行 graph 测试并重写 `qa.run_chat` 以委派工作流。**

Run: `python -m pytest AI/tests/graph AI/tests/chains/test_qa_routing.py -v`

Expected: PASS.

### Task 3: 暴露 FastAPI 聊天、流式中断与恢复契约

**Files:**
- Create: `AI/tests/API/test_chat_routes.py`
- Modify: `AI/wenrun_ai/API/schemas.py`
- Modify: `AI/wenrun_ai/API/routers/chat.py`

- [ ] **Step 1: 编写失败 API 测试。**

```python
def test_chat_returns_pending_interrupt(monkeypatch):
    monkeypatch.setattr(chat, "run_chat_execution", lambda **_: pending_execution())
    response = client.post("/v1/chat", json={"message": "缴费", "conversationId": "a"})
    assert response.json() == {"reply": None, "status": "pending", "conversationId": "a", "interrupts": [{"tool": "pay_charge"}]}

def test_resume_forwards_decision(monkeypatch):
    monkeypatch.setattr(chat, "resume_chat", lambda conversation_id, decision: completed_execution("已支付"))
    response = client.post("/v1/chat/resume", json={"conversationId": "a", "decision": {"type": "approve"}})
    assert response.json()["reply"] == "已支付"
```

- [ ] **Step 2: 运行 API 测试确认路由不存在或模型不匹配。**

Run: `python -m pytest AI/tests/API/test_chat_routes.py -v`

Expected: FAIL.

- [ ] **Step 3: 添加 `ChatExecutionResponse`、`ChatResumeRequest` 和路由实现。**

```python
class ChatExecutionResponse(BaseModel):
    reply: str | None = None
    status: Literal["completed", "pending"]
    conversation_id: str = Field(alias="conversationId")
    interrupts: list[dict] = Field(default_factory=list)

@router.post("/chat/resume", response_model=ChatExecutionResponse)
def post_chat_resume(body: ChatResumeRequest) -> ChatExecutionResponse:
    return serialize_execution(resume_chat(body.conversation_id, body.decision))
```

- [ ] **Step 4: 将流式执行转换为 `status`、`token`、`interrupt`、`done`。**

```python
if execution.status == "pending":
    yield {"type": "interrupt", "conversationId": execution.conversation_id, "interrupts": execution.interrupts}
    return
yield {"type": "done", "reply": execution.reply}
```

- [ ] **Step 5: 运行全部 Python 测试。**

Run: `python -m pytest AI/tests -v`

Expected: PASS.

### Task 4: 将恢复契约接入 WenRun

**Files:**
- Create: `WenRun/src/main/java/com/example/wenrun/ai/dto/ChatResumeRequestDTO.java`
- Create: `WenRun/src/main/java/com/example/wenrun/ai/vo/ChatExecutionVO.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/config/AiServiceProperties.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/client/AiServiceClient.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/service/AiChatService.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/service/serviceImpl/AiChatServiceImpl.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/controller/AiChatController.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/ai/vo/ChatStreamEventVO.java`

- [ ] **Step 1: 编写失败 Spring MVC/JSON 测试，固定恢复请求和 interrupt 事件。**

```java
assertThat(objectMapper.readValue("{\"type\":\"interrupt\",\"interrupts\":[{\"tool\":\"pay_charge\"}]}", ChatStreamEventVO.class)
        .getInterrupts()).hasSize(1);
assertThat(objectMapper.readValue("{\"conversationId\":\"a\",\"decision\":{\"type\":\"approve\"}}", ChatResumeRequestDTO.class)
        .getConversationId()).isEqualTo("a");
```

- [ ] **Step 2: 运行 Maven 测试确认类不存在。**

Run: `./mvnw test -Dtest=AiChatContractTests`

Expected: FAIL with missing DTO/VO.

- [ ] **Step 3: 实现 DTO、VO、配置和代理。**

```java
@PostMapping("/chat/resume")
public Result<ChatExecutionVO> resume(@Valid @RequestBody ChatResumeRequestDTO dto, HttpServletRequest request) {
    enrichContext(dto, resolveToken(request));
    ChatExecutionVO execution = aiChatService.resume(dto);
    if ("completed".equals(execution.getStatus()) && StringUtils.hasText(execution.getReply())) {
        saveMessage(dto.getConversationId(), dto.getUserId(), "assistant", execution.getReply());
    }
    return Result.success(execution);
}
```

`AiServiceClient` 必须调用 `chatResumePath`，并将 FastAPI 非 2xx 响应转换为 `AiServiceException`。`ChatStreamEventVO` 新增 `conversationId` 与 `List<Map<String,Object>> interrupts`。

- [ ] **Step 4: 运行 WenRun 测试。**

Run: `./mvnw test`

Expected: PASS.

### Task 5: 在 React 渲染和恢复 HITL 操作

**Files:**
- Modify: `React/src/api/modules/ai.js`
- Modify: `React/src/views/Assistant/index.jsx`

- [ ] **Step 1: 为 API 模块增加可单独测试的事件归一化函数，并先写失败断言。**

```javascript
expect(normalizeChatEvent({ type: 'interrupt', conversationId: 'a', interrupts: [{ tool: 'pay_charge' }] }))
  .toEqual({ type: 'interrupt', conversationId: 'a', interrupts: [{ tool: 'pay_charge' }] })
```

- [ ] **Step 2: 运行 React 静态检查，确认新增导出尚不存在。**

Run: `npm run lint`

Expected: FAIL until the new module export and its use are implemented.

- [ ] **Step 3: 实现 SSE interrupt 传递和恢复请求。**

```javascript
export async function resumeChat(conversationId, decision) {
  const { default: request } = await import('../request')
  return request.post('/api/ai/chat/resume', { conversationId, decision })
}
```

- [ ] **Step 4: 实现确认卡片并连接会话状态。**

```jsx
function HitlCard({ interrupt, onDecision, disabled }) {
  return <section className="chat-hitl-card">
    <strong>{interrupt.title || interrupt.tool}</strong>
    <p>{interrupt.summary}</p>
    <button disabled={disabled} onClick={() => onDecision({ type: 'approve' })}>确认执行</button>
    <button disabled={disabled} onClick={() => onDecision({ type: 'reject' })}>拒绝</button>
  </section>
}
```

`ChatMessage` 在 `message.interrupt` 存在时渲染卡片；收到 `interrupt` 事件时追加 `{role: "assistant", content: "", interrupt}`；恢复成功后标记旧卡片已处理并按 `status` 追加回复或下一张卡片。

- [ ] **Step 5: 运行 lint 和构建。**

Run: `npm run lint && npm run build`

Expected: PASS.

### Task 6: 集成验证与旧工作树清理

**Files:**
- Modify: `AI/README.md`
- Modify: `WenRun/docs/API.md`

- [ ] **Step 1: 更新运行说明，明确普通聊天、流式 interrupt、resume、进程内 checkpoint 限制和启动顺序。**

- [ ] **Step 2: 运行最终验证。**

Run: `python -m pytest AI/tests -v`

Expected: PASS.

Run: `./mvnw test`

Expected: PASS.

Run: `npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 3: 核对旧工作树与主目录的 LangGraph/HITL 文件清单。**

Run: `rg -n "StateGraph|HumanInTheLoopMiddleware|interrupt\(|Command\(resume" AI WenRun React`

Expected: 主目录命中新的正式实现；旧 worktree 所需代码已迁移。

- [ ] **Step 4: 删除已迁移的旧 worktree 并修剪登记。**

Run: `git worktree remove --force .worktrees/security-boundary-hardening`

Run: `git worktree prune`

Run: `git worktree list`

Expected: 列表不包含 `security-boundary-hardening`。

- [ ] **Step 5: 仅暂存本次整合文件并创建提交。**

Run: `git add AI WenRun React docs && git status --short`

Expected: 暂存内容仅为本计划产生的 AI、WenRun、React、docs 改动；不暂存用户已有的目录迁移和其他未关联改动。
