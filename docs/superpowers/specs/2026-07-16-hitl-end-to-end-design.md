# WenRun 端到端 HITL 设计

## 目标

让医院聊天助手在执行有副作用的业务工具前暂停，向当前登录用户展示待执行操作，并支持确认、修改或拒绝；普通查询、医疗科普和闲聊不产生无关中断。

本次覆盖 `AI`、`WenRun` 和 `React` 三层，保留现有 RAG、记忆、认证、SSE 和业务工具能力。首阶段继续使用 Python 进程内 LangGraph checkpoint，服务重启后未恢复的待确认会话失效，不引入数据库 checkpoint。

## 统一协议

### Python 对外响应

`POST /v1/chat` 和 `POST /v1/chat/stream` 使用同一执行模型：

- 完成：`status=completed`、`reply` 为最终回复、`interrupts=[]`。
- 等待确认：`status=pending`、`reply=null`、`interrupts` 为待确认操作。

每个 interrupt 至少包含 `tool`、`args`、`title`、`summary`、`details` 和 `allowedDecisions`。决策类型统一为 `approve`、`edit`、`reject`。`edit` 必须携带对象类型的 `args`，`reject` 必须携带非空 `message`。

`POST /v1/chat/resume` 接收 `conversationId`、单个决策或与 pending 数量一致的 `decisions` 数组。服务端以 checkpoint 中的 interrupt 数量、工具名和允许决策集合为准，不接受客户端覆盖工具名或执行任意工具。恢复后可再次返回 pending，也可返回 completed。

### Java 对外响应

Java DTO/VO 与 Python 字段保持 `conversationId`、`allowedDecisions` 等 JSON 命名。`/api/ai/chat` 返回 pending 时不要求 reply；`/api/ai/chat/resume` 只在 completed 且 reply 非空时保存 assistant 消息。初始用户消息仍只保存一次，流式 pending 事件不得发送 done，也不得保存空 assistant 消息。

Java resume 请求忽略客户端提交的身份字段，完全依据当前请求 token 重建 `userId`、角色、患者/医生上下文和内部 `apiKey`。恢复调用使用与初始调用相同的用户范围，因此不同用户不能读取或恢复同一个 thread。

### React 对外行为

SSE 收到 `interrupt` 后在当前会话中追加确认卡片并结束本次发送状态；不创建空的普通 assistant 回复。卡片展示标题、摘要、参数和可用决策按钮；编辑使用受控 JSON 编辑器，拒绝时要求原因。提交期间禁用卡片按钮，成功后标记原卡片已处理；如果服务端返回新的 pending 操作，追加新的卡片；如果 completed，追加最终回复。

前端只发送 `{ conversationId, decision: { decision: "approve" } }`、`{ decision: "edit", args }` 或 `{ decision: "reject", message }`，不发送工具名作为授权依据。恢复请求沿用现有认证客户端和当前会话 ID。

## Python 架构与数据流

1. `ChatWorkflow.invoke` 标准化 conversation ID，并用 `user-{userId}:{conversationId}` 生成 thread ID。
2. 图依次执行记忆检索、意图路由、知识库检索和 Agent 调用。
3. registration Agent 的白名单写工具通过 HITL middleware 触发 interrupt；图将 middleware 的 action request 规范化为稳定 UI payload。
4. `ChatWorkflow.resume` 查询同一用户 thread 的 checkpoint，先校验 pending interrupt 与决策，再用 `Command(resume=...)` 恢复图。
5. approve 继续执行原始工具，edit 只替换允许的参数，reject 返回 Agent 可解释结果；再次触发写工具时重新返回 pending。
6. 仅 completed 结果进入记忆存储节点。

保护工具固定为现有 11 个写工具：`create_patient`、`create_registration`、`cancel_registration`、`start_visit`、`update_visit`、`create_exam_request`、`create_prescription`、`cancel_prescription`、`create_charge_from_visit`、`pay_charge`、`dispense_prescription`。查询工具默认直接执行。

对非法决策、缺失 checkpoint、已结束会话、跨用户恢复和工具执行异常返回明确业务错误；不向客户端暴露堆栈。恢复过程需要避免同一 checkpoint 被重复消费，至少通过 LangGraph 状态检查拒绝已完成或没有 pending 的重复请求。

## Java 组件改动

- 扩展/校正 `ChatResponseVO`、`ChatExecutionVO`、`ChatStreamEventVO`，完整承载 pending 状态和 interrupt 字段。
- 在 `AiServiceProperties`、`AiServiceClient`、`AiChatService`、`AiChatServiceImpl` 中保持 `/v1/chat/resume` 调用，并统一错误映射。
- 在 `AiChatController` 中增加或校正 resume 路由、认证上下文重建、pending 条件下的消息持久化，以及 SSE interrupt 转发。
- 保留现有聊天接口兼容性，完成状态的旧调用者仍获得字符串 reply。

## React 组件改动

- 统一 `ai.js` 的 resume payload 与 Python 决策协议。
- 调整 `Assistant` 的发送状态管理，使 interrupt 不被误认为普通 assistant 消息。
- 完善确认卡片的 approve/edit/reject 交互、错误恢复和重复提交保护。
- 继续支持 PC 与移动布局，不引入新的 UI 依赖。

## 测试与验收

### Python

- 策略白名单、payload 格式化、决策校验。
- 查询与普通对话不暂停；写工具暂停。
- approve/edit/reject 恢复、再次 pending、多步 interrupt。
- thread 隔离、无效恢复、重复恢复和 API/SSE 响应契约。

### Java

- DTO/VO JSON 字段反序列化。
- client resume 路径与错误处理。
- controller pending 不保存空 assistant，completed 保存最终 reply，resume 使用服务端身份。
- SSE interrupt 事件正确转发。

### React

- lint 与生产构建。
- SSE interrupt 解析、卡片展示、决策 payload、提交锁定、completed/pending 分支。

验收标准是：用户发起挂号、支付、开方等写操作时，业务工具执行前能在前端看到确认卡片；确认后真实恢复并执行，修改后使用修改参数，拒绝后不执行；刷新/切换用户不会越权恢复；普通聊天功能不回退。
