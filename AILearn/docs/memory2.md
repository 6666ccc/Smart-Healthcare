# AI 记忆功能 — Java 侧变更交底文档

> **写给 Python AI 侧**，说明 Java（HuiLiao 网关）已完成的变更，以及双方接口约定。

---

## 一、变更概述

为配合 Python AI 服务实现基于 Qdrant 向量库的对话记忆功能，Java 侧完成了以下变更：

| # | 变更 | 类型 | 状态 |
|---|------|------|------|
| 1 | `ChatRequestDTO` 新增 `conversationId` 字段 | 数据传递 | ✅ 已就绪 |
| 2 | `ChatRequestDTO` 新增 `memoryEnabled` 字段 | 数据传递 | ✅ 已就绪 |
| 3 | 建 `chat_messages` 表 + 实体 + Mapper | 数据存储 | ✅ 已就绪 |
| 4 | `AiChatController` 网关层截获消息入库 | 数据存储 | ✅ 已就绪 |

---

## 二、`conversationId` — 核心变更

### 2.1 已添加到请求体

`POST /v1/chat` 的 JSON 请求体现在包含 `conversationId` 字段。Java 通过 `RestClient` 将 `ChatRequestDTO` 序列化为 JSON 后发给 Python，新增字段自动出现在请求体中：

```json
{
  "message": "我最近血压怎么样？",
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "memoryEnabled": true,
  "apiKey": "...",
  "userId": 12,
  "username": "zhangsan",
  "realName": "张三",
  "roleCode": "patient",
  "portalType": "patient",
  "patientId": 5,
  "patientNo": "P20240001",
  "patientName": "张三",
  "patientGender": 1,
  "patientBirthDate": "1985-03-15",
  "patientAllergyHistory": "青霉素过敏",
  "staffId": null
}
```

### 2.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversationId` | `String` (UUID v4) | 由前端保证，但 API 层面定义为必填 | 会话唯一标识。前端每次新建对话时用 `crypto.randomUUID()` 生成，同一对话窗口内每次请求携带相同值 |
| `message` | `String` | 是 | 用户本轮提问文本 |
| `memoryEnabled` | `Boolean` | 否 | 是否启用记忆。`false` 时 AI 服务应跳过 Qdrant 检索与写入。未传/`null` 时默认启用 |
| `userId` | `Long` | 否 | 当前登录用户的 sys_user.id |
| `patientId` | `Long` | 否 | 患者档案 ID（仅患者端登录时有值） |
| `patientNo` | `String` | 否 | 患者编号 |
| `patientName` | `String` | 否 | 患者姓名 |
| `patientBirthDate` | `String` (ISO date) | 否 | 患者出生日期，格式 `yyyy-MM-dd` |
| `patientGender` | `Integer` | 否 | 0=女, 1=男, 2=未知 |
| `patientAllergyHistory` | `String` | 否 | 患者过敏史文本 |
| `staffId` | `Long` | 否 | 医生 ID（仅医生端登录时有值） |
| `username` / `realName` / `roleCode` / `portalType` | `String` | 否 | 用户上下文信息 |
| `apiKey` | `String` | 是 | 内部调用密钥，同现有 |

### 2.3 后端兼容策略

Python 侧收不到 `conversationId` 或为空时，退化为**无记忆模式**（与当前行为一致），不要报错。

---

## 三、`memoryEnabled` — 隐私控制

该字段在前端用户选择"敏感模式"或特定科室（如妇科、心理科）时由前端置为 `false`。

**Python 侧逻辑**：
- `memoryEnabled = false` → 本轮不检索记忆、不写入记忆
- `memoryEnabled = true` 或 `null`/缺失 → 正常启用记忆

---

## 四、`chat_messages` 表 — Java 侧自行管理

Java 在建了 `chat_messages` 表，由 `AiChatController` 在调用 AI 前后各写入一条：

```
用户发消息 → Java 存 role='user' → 调 AI → Java 存 role='assistant' → 返回前端
```

这张表是 Java 侧独立管理的，**Python 侧无需关心**。它与 Qdrant 向量记忆的关系：

| 维度 | chat_messages (MySQL) | Qdrant |
|------|----------------------|--------|
| 存储内容 | 时间线纯文本 | 带向量的语义片段 |
| 用途 | 前端回显 & 审计 | Agent 检索记忆 |
| 管理者 | Java | Python AI |

---

## 五、Patient 信息传输要点

### 5.1 现有患者字段（已稳定传输）

Java 在 `enrichContext()` 中自动根据 token 解析用户身份，患者端登录时会自动填充以下字段到请求体（无需前端显式传）：

| 字段 | 来源 | 说明 |
|------|------|------|
| `patientId` | `patient.id` | 患者主键 |
| `patientNo` | `patient.patient_no` | 患者档案编号 |
| `patientName` | `patient.name` | 患者姓名 |
| `patientGender` | `patient.gender` | 0 女 / 1 男 / 2 未知 |
| `patientBirthDate` | `patient.birth_date.toString()` | 格式 `yyyy-MM-dd` |
| `patientAllergyHistory` | `patient.allergy_history` | 过敏史原始文本 |

### 5.2 注意

- **非患者端**（如医生查看患者档案后提问），以上患者字段为 `null`。Python 侧做记忆检索或 Prompt 注入时，务必判空。
- `patientBirthDate` 是 `LocalDate.toString()` 的结果（ISO 格式 `yyyy-MM-dd`），不是时间戳。
- `patientAllergyHistory` 可能为长文本，注意 Prompt 长度控制。

---

## 六、修改的文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/main/java/com/example/huiliao/ai/dto/ChatRequestDTO.java` | 修改 | 新增 `conversationId`、`memoryEnabled` 字段 |
| `src/main/java/com/example/huiliao/ai/controller/AiChatController.java` | 修改 | 新增 `ChatMessageMapper` 依赖；在 `chat()` 方法中保存 user/assistant 消息 |
| `src/main/java/com/example/huiliao/entity/ChatMessage.java` | 新增 | chat_messages 表实体 |
| `src/main/java/com/example/huiliao/mapper/ChatMessageMapper.java` | 新增 | MyBatis Mapper 接口 |
| `src/main/resources/mapper/ChatMessageMapper.xml` | 新增 | MyBatis SQL 映射 |
| `docs/SQL/huiliao.sql` | 修改 | 新增 `chat_messages` 建表语句 |

---

## 七、联系方式

如有字段对齐或接口集成问题，请联系 Java 后端开发方。

> 文档生成时间：2026-06-11
