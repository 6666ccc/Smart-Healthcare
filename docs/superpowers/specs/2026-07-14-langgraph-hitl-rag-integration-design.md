# LangGraph、HITL 与 RAG 整合设计

## 目标

以主目录中的 `AI`、`WenRun`、`React` 为唯一正式项目，把
`.worktrees/security-boundary-hardening/wenrun-AI` 中的 LangGraph 编排和
HITL 暂停/恢复能力迁入当前 `AI/wenrun_ai`，同时保留已经实现的 RAG、
Qdrant 知识库、会话记忆、用户画像、业务工具、流式响应和现有认证链路。

整合完成后，用户可以在同一个聊天入口中：

- 询问通用医疗知识，并检索通用医疗知识库；
- 询问院内服务，并检索医院定制知识库；
- 查询实时医院业务数据；
- 在执行有副作用的业务操作前查看操作内容并确认、修改或拒绝；
- 使用同一 `conversationId` 恢复被暂停的 LangGraph 会话。

## 现状与约束

当前 `AI/wenrun_ai` 已经提供意图路由、三类 Agent、RAG、Qdrant 记忆、
`/v1/chat` 和 `/v1/chat/stream`。旧工作树则提供显式 StateGraph、
`HumanInTheLoopMiddleware`、主图和工具 Agent 的双层 checkpoint，以及
`interrupt()` / `Command(resume=...)` 恢复逻辑。

旧工作树的 HITL 尚未端到端完成：Python 有恢复入口，但 Java 没有恢复代理，
React 也没有待确认操作组件。因此本次不能机械复制旧目录，而应将其核心机制
迁入当前架构并补齐完整调用链。

主工作区已有未提交的目录统一工作：`AILearn` 到 `AI`、`HuiLiao` 到
`WenRun`、`huiliao-react` 到 `React`。这些改动属于现有成果，本次整合不得
回滚或覆盖。

## 方案选择

采用“以当前 RAG 项目为主干，迁入 LangGraph/HITL”的方案。

不采用以旧版 `app` 为主干的方案，因为这会反向迁移当前认证、记忆、RAG、
工具和流式接口，产生两套包结构与大量重复代码。也不采用只给当前 Agent
附加 HITL 中间件的方案，因为它无法保留显式主图和可观察的编排边界。

## Python 架构

新增 `AI/wenrun_ai/graph/`，按职责拆分：

- `state.py`：定义主图状态，包括请求上下文、意图、RAG 上下文、记忆、
  最终回复和待确认操作；
- `hitl.py`：定义有副作用工具策略、interrupt 载荷格式化和恢复决策校验；
- `nodes.py`：实现记忆检索、意图路由、知识检索、Agent 调用、HITL 恢复和
  记忆存储节点；
- `workflow.py`：构建、编译并封装 StateGraph，对外暴露 `invoke`、`resume`
  和流式执行接口。

现有 `chains/qa.py` 保留为兼容层和 Agent 构建模块。其公开聊天函数改为调用
统一工作流，不再自行重复执行“记忆 → 路由 → RAG → Agent → 存储”流程。
`chains/router.py` 的意图解析继续复用。

主图数据流为：

1. 标准化 `conversationId`，并将其作为 LangGraph `thread_id`；
2. 检索会话记忆和用户画像；
3. 识别 medical、registration 或 chat 意图；
4. medical 检索通用医疗知识库，registration 检索医院定制知识库，chat
   不检索知识库；
5. 调用对应 Agent；
6. registration Agent 若准备调用受保护写工具，则主图暂停并返回待确认操作；
7. 普通回答或已批准工具的最终结果进入记忆存储节点；
8. 返回统一执行结果。

## HITL 策略

HITL 采用明确白名单，只保护当前实际存在的 11 个写工具：
`create_patient`、`create_registration`、`cancel_registration`、`start_visit`、
`update_visit`、`create_exam_request`、`create_prescription`、
`cancel_prescription`、`create_charge_from_visit`、`pay_charge` 和
`dispense_prescription`。所有其他工具均为查询工具，默认不暂停。

每个待确认操作必须包含：

- 工具名与面向用户的标题；
- 工具参数原值；
- 可读的参数标签和摘要；
- 允许的决策类型；
- 所属 `conversationId`。

写操作只支持 `approve`、`edit` 和 `reject`。`respond` 不作为写工具恢复指令：
当前 LangChain 会跳过工具调用并写入一条工具消息，可能让 Agent 误以为业务
操作已经成功。用户需要补充信息时应发送普通聊天消息，再由 Agent 重新发起
可确认的操作。服务端不信任客户端回传的工具名称或允许决策集合；恢复时以
checkpoint 中的待确认操作及该工具的允许决策为准校验请求。

主图与带中间件的工具 Agent 都使用 checkpoint。第一阶段沿用进程内
`InMemorySaver`，与旧实现行为一致，并在文档中明确：服务重启会丢失待恢复
会话，不支持多实例共享。持久化 checkpoint 属于后续独立工作，不在本次范围。

## API 契约

保留：

- `POST /v1/chat`；
- `POST /v1/chat/stream`；
- 现有知识库管理接口。

新增：

- `POST /v1/chat/resume`。

非流式聊天返回统一响应，包含：`reply`、`status`、`conversationId` 和
`interrupts`。为兼容当前调用者，完成状态下继续保证 `reply` 为字符串。

流式聊天继续产生 `status`、`token`、`done` 和 `error`，并新增 `interrupt`
事件。发生暂停时，先发送 `interrupt`，再结束本次 SSE；不得伪造 `done`
或存储空的助手回复。

恢复接口接收 `conversationId` 与单个决策。恢复后可能：

- 完成并返回最终 `reply`；
- 因多步工具调用再次返回 `pending` 和新的 `interrupts`；
- 返回明确的会话不存在、已结束或决策无效错误。

## Java 集成

在当前 `WenRun` 的 AI 模块中扩展现有 DTO、VO、客户端、服务与控制器：

- 当前聊天和流式路径保持不变；
- 增加 FastAPI 恢复路径配置及客户端调用；
- 增加 `/api/ai/chat/resume`；
- 流式事件 VO 能反序列化 `interrupt` 内容；
- 只有完成后的最终回复写入 `chat_message`；待确认状态不写空助手消息；
- 恢复调用重新注入当前登录用户上下文，不能接受客户端伪造身份。

## React 交互

当前流式聊天体验保持不变。收到 `interrupt` 事件时，在对应助手消息位置渲染
待确认卡片，展示操作名称、摘要和参数。用户可以确认、拒绝；对于允许编辑的
操作，显示受控参数表单后提交。需要补充信息时，用户通过普通消息重新描述
需求，Agent 再决定是否发起新的待确认操作。

提交决策期间禁用重复操作。恢复完成后把最终回复追加到同一会话；如果返回新
的待确认操作，则原卡片标记为已处理并显示新卡片。刷新页面后进程内 checkpoint
可能仍在，但前端本地会话只保存可序列化的待确认载荷，不保存认证信息。

## 错误处理与安全边界

- RAG 或记忆服务不可用时记录警告并降级到基础 Agent；
- checkpoint 不存在或会话已完成时返回可识别的 409/404 类业务错误；
- 工具执行失败作为 Agent 可解释结果返回，不把敏感堆栈暴露给前端；
- 知识库文本始终作为不可信参考资料，不得改变工具策略；
- HITL 只批准当前 checkpoint 中的调用，不能用恢复接口任意执行工具；
- 同一恢复决策必须防止重复提交导致写操作重复执行。

## 测试策略

按 TDD 完成以下行为：

- 意图到知识库的映射与 RAG 上下文注入；
- RAG 失败时的降级；
- 查询工具不中断，写工具返回结构化 interrupt；
- approve、edit、reject 恢复流程；
- conversation/thread 隔离和无效恢复；
- API 普通完成、暂停、恢复和 SSE interrupt 契约；
- Java DTO 序列化、客户端路径和控制器消息存储条件；
- React interrupt 解析、确认卡片状态和恢复请求；
- Python 全量测试、Maven 测试、React 测试/静态检查与生产构建。

外部 LLM、Qdrant 和 Java 服务通过边界注入替身，测试真实图路由与状态变换，
避免只验证 mock 调用次数。

## 目录整理与旧工作树清理

正式代码只保留在：

- `AI/`；
- `WenRun/`；
- `React/`；
- `docs/`。

不得把旧工作树的 `.git`、缓存、虚拟环境、构建产物、编辑器文件或重复文档
复制到主目录。清除已经被 `.gitignore` 覆盖的 `.pytest_cache` 等本地缓存。

完成全部测试和差异核对后：

1. 确认旧工作树中 LangGraph/HITL 的必要 Python、Java 和 React 行为均已迁移；
2. 记录旧工作树仍存在的未提交差异及其是否与本目标相关；
3. 使用 `git worktree remove` 清理 `.worktrees/security-boundary-hardening`；
4. 使用 `git worktree prune` 清除登记信息；
5. 确认主目录不再包含重复的 `wenrun-AI`、`wenrun-react` 或旧命名项目目录。

用户已经明确授权在迁移和验证完成后删除该旧工作树。

## 验收标准

- 主目录只有一套 Python、Java 和 React 正式实现；
- 聊天请求实际经过 LangGraph 主图；
- medical 与 registration 分别使用正确的 RAG 知识库；
- 受保护写操作在执行前暂停，React 可确认、修改或拒绝并恢复；
- 查询、普通聊天和医疗科普不产生无关中断；
- 当前认证、记忆、流式输出和知识库管理功能不回退；
- Python、Java、React 验证全部通过；
- `.worktrees/security-boundary-hardening` 已安全删除并从 Git worktree 列表清除。
