# AI 服务记忆功能 — Java 侧配合说明

> 本文面向 Java（HuiLiao 网关/后端）开发，说明 Python AI 服务实现**基于 Qdrant 向量库的对话记忆**需要 Java 提供什么、以及双方各负责什么。

---

## 一、记忆方案概述

```
用户提问
  → AI 服务将问题向量化，去 Qdrant 检索与该用户最相关的历史记忆
  → 将检索到的记忆片段注入 Prompt
  → Agent 结合记忆作答
  → 本轮问答向量化后回存 Qdrant
```

与 LangGraph Checkpointer（按时间顺序恢复历史）不同，此方案按**语义相关性**检索记忆，不受上下文窗口硬限制，且支持跨会话关联。

---

## 二、Java 需要提供的数据

### 唯一必选项：ChatRequest 新增 `conversationId`

Java 调用 `POST /v1/chat` 时，请求体需新增一个字段：

```json
{
  "message": "我最近血压怎么样？",
  "conversationId": "uuid-xxxx",
  "apiKey": "...",
  "userId": 12
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversationId` | `String` | **是** | 会话唯一标识，前端每次新建对话时生成 UUID。同一对话窗口内的所有请求共用一个 ID |

**`conversationId` 的作用**：AI 服务在 Qdrant 中检索记忆时，以 `conversationId` 作为过滤条件，确保只检索当前会话的上下文，不会跨会话串数据。

### 不需要 Java 提供

以下事项由 AI 服务自行处理，Java 无需参与：

| 事项 | AI 服务如何解决 |
|------|----------------|
| Qdrant 连接地址、鉴权 Key、Collection 名称 | 写在 AI 服务的 `.env` 中，与 `OPENAI_API_KEY` 同模式 |
| 文本向量化（Embedding） | 复用现有 `OPENAI_API_KEY` 调用 `text-embedding-3-small`，零额外部署 |
| 记忆的存取、检索、过期清理 | AI 服务代码负责，可逐步迭代策略（检索 Top-K、去重、记忆生命周期） |
| Agent 内部状态的持久化 | 与记忆功能分开考虑，不在本次范围 |

---

## 三、Java 侧建议做的事（与 AI 记忆无关，但推荐）

### 存储聊天记录 Plaintext（供前端回显 & 审计）

在业务库中建一张 `chat_messages` 表，由 Java 网关在调用 AI 前后各插一条：

```sql
CREATE TABLE chat_messages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id VARCHAR(36)  NOT NULL COMMENT '会话ID，与传给AI的conversationId一致',
    user_id         BIGINT       COMMENT '发送者用户ID',
    role            VARCHAR(16)  NOT NULL COMMENT 'user / assistant',
    content         TEXT         NOT NULL COMMENT '消息纯文本',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_conversation (conversation_id, created_at),
    INDEX idx_user (user_id, created_at)
);
```

**为什么要 Java 存而不是 AI 服务存？**

| 理由 | 说明 |
|------|------|
| 数据归属 | 聊天记录是业务数据，Java 作为主业务系统统一管理所有数据 |
| 前端回显 | 前端"历史对话"列表直接查 Java 接口，不需要多一次 AI 服务调用 |
| 审计合规 | 医疗场景中对话可能涉及诊疗建议，需要落在业务库的事务与备份体系内 |
| AI 服务保持无状态 | AI 服务只管"当前问题 + 检索到的记忆"，不负责数据持久化 |

> **注意区分**：这张表存的是**时间线上的纯文本消息**（前端展示用），Qdrant 存的是**带向量的语义片段**（Agent 检索用）。两者各司其职，不重复也不冲突。

---

## 四、前端配合建议

客户端（Web / 小程序）在每次新建对话时生成一个 UUID 作为 `conversationId`，后续该对话所有请求携带同一 ID。建议：

- 用 `crypto.randomUUID()`（浏览器原生）或各平台的 UUID 工具生成
- 不要用自增数字（避免被猜测和遍历）
- 用户切换到历史对话时，前端重新加载对应 `conversationId` 的消息列表（从 Java 的 `chat_messages` 表加载）

---

## 五、注意事项

### 5.1 字段命名对齐

AI 服务的 `ChatRequest` 使用驼峰别名 `conversationId`（与 `userId`、`patientId` 等现有字段风格一致）。双方务必对齐字段名，避免反序列化丢失。

### 5.2 向后兼容

`conversationId` 在 API 层面定义为**必填**，但建议 Java 侧前端上线做灰度——先发版支持传 ID，再发版启用记忆。AI 服务收不到该字段时退化为无记忆模式（与当前行为一致），不会报错。

### 5.3 会话边界

- 患者新建对话 → 新 `conversationId`，Qdrant 中记忆隔离
- 患者删除对话 → Java 可通知 AI 侧清理（后续可扩展记忆管理 API），或依赖 TTL 自动过期
- 同一患者多个会话之间的记忆**默认不共享**。如需跨会话记忆（如"你上次说的是…"能跨对话），后续可升级为按 `userId` 维度检索

### 5.4 性能

- Qdrant 在万级向量规模下检索延迟通常在 10ms 以内，不会成为瓶颈
- Embedding API 调用约 50–200ms（取决于模型和网络），建议对同一轮内的多条记忆写入做批量 embedding

### 5.5 隐私与合规

- 如需删除某用户全部数据（用户注销），Java 可直接调用 Qdrant 的 `delete` API 按 `userId` 过滤删除，或由 AI 服务提供记忆管理回调接口
- 敏感场景（如某些科室问诊）允许前端传 `memoryEnabled: false` 暂停记忆

---

## 六、总结清单

| # | 事项 | 负责方 | 优先级 |
|---|------|--------|--------|
| 1 | `ChatRequestDTO` 新增 `conversationId` 字段 | Java | **必须** |
| 2 | 建 `chat_messages` 表，网关层截获消息入库 | Java | 建议 |
| 3 | 前端新建对话时生成 UUID 并随请求携带 | 前端 | 建议 |
| 4 | Qdrant 部署与连接配置 | 运维 / AI 侧 `.env` | 必须 |
| 5 | AI 服务实现记忆存取逻辑 | Python AI | 必须 |

---

> 如有疑问或需要调整，请联系 AI 服务开发方对齐。
