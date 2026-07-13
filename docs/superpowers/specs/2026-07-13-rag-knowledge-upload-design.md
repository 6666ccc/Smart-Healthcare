# RAG 双知识库文档上传设计

## 1. 目标

为 WenRun 增加一条完整、可管理的 RAG 文档入库链路：管理员通过 Java 接口上传文档，Java 负责权限、文件存储、任务状态和失败重试，Python AI 服务负责文档解析、切片、Embedding 和 Qdrant 写入。聊天时，三意图路由只让对应 Agent 检索自己的知识库。

本期只交付后端接口、SQL、接口文档和自动化测试，不实现管理员前端。

## 2. 已有系统与改造边界

- Java 服务位于 `WenRun/`，使用 Spring Boot 3.5.6、MyBatis、MySQL 和 `RestClient`，现有 `/api/ai` 接口会把聊天请求转发给 Python。
- Python 服务位于 `AI/`，使用 FastAPI、LangChain/LangGraph、OpenAI 兼容 Embedding API 和 Qdrant。
- 当前活跃 Python 代码是单 Agent 加全量 Tools。Git 历史中存在经过验证的三意图设计：`medical`、`registration`、`chat`。本期将该路由思想迁移并适配当前代码，而不是回退整个仓库。
- 已有对话记忆 Collection 与知识库 Collection 分离，不改变现有会话记忆和用户画像行为。

## 3. 知识库与 Agent 映射

系统使用两个物理隔离的 Qdrant Collection：

| API 知识库标识 | Qdrant Collection | 使用方 | 内容 |
|---|---|---|---|
| `medical-general` | `wenrun_medical_general` | `medical_agent` | 通用医疗知识、疾病科普、药物和健康知识 |
| `hospital-custom` | `wenrun_hospital_custom` | `registration_agent` | 医院地图、院内流程、科室说明、就诊指引等定制内容 |

三条意图固定为：

- `medical -> medical_agent`：只检索 `wenrun_medical_general`，不调用医院业务 Tools。
- `registration -> registration_agent`：检索 `wenrun_hospital_custom`，并保留科室、医生、排班、挂号、缴费等业务 Tools 与需要人工确认的 HITL 流程。
- `chat -> chat_agent`：不执行知识库检索，也不调用业务 Tools。

医生、排班、号源、价格等可能变化的数据以 Java Tool 的实时结果为准。医院知识库只补充静态说明，不得用历史文档覆盖实时 Tool 结果。

## 4. 总体数据流

### 4.1 上传

1. 管理员调用带知识库路径参数的 Java multipart 接口。
2. Java 校验管理员权限、知识库枚举、文件扩展名、MIME、大小和内容摘要。
3. Java 使用 UUID 重命名文件并保存到配置目录，写入 MySQL 文档记录，状态为 `PROCESSING`。
4. Java 提交后台任务并立即返回 `documentId` 和 `PROCESSING`，不等待解析或向量化完成。
5. 后台任务将源文件、`documentId` 和知识库类型以 multipart 转发给 Python 内部接口。
6. Python 解析、清洗、切片并批量生成 Embedding。
7. Python 根据知识库枚举选择唯一允许的 Qdrant Collection，写入切片。
8. Python 返回切片数；Java 将记录更新为 `READY`。任何异常都更新为 `FAILED` 并保存适合管理员查看的错误摘要。

### 4.2 检索

1. 三意图节点判断 `medical`、`registration` 或 `chat`。
2. `medical` 和 `registration` 分支在执行 Agent 前调用各自固定的知识库检索器。
3. 检索器对用户问题生成 Embedding，从固定 Collection 取 Top 5，并应用相关性阈值。
4. 命中的片段以 `<knowledge_context>` 块注入 Agent Prompt，并携带来源文件名。
5. 没有达到阈值的片段时不注入上下文，禁止用无关内容凑答案。

## 5. Java 管理接口

所有接口位于 `/api/ai/knowledge-bases/{knowledgeBase}/documents`，其中 `{knowledgeBase}` 只接受 `medical-general` 和 `hospital-custom`。

| 方法 | 路径 | 行为 |
|---|---|---|
| `POST` | `/api/ai/knowledge-bases/{knowledgeBase}/documents` | 上传一个文件，立即返回文档标识和处理状态 |
| `GET` | `/api/ai/knowledge-bases/{knowledgeBase}/documents` | 按状态分页查询未删除文档 |
| `GET` | `/api/ai/knowledge-bases/{knowledgeBase}/documents/{documentId}` | 查询文档详情、状态、切片数和失败原因 |
| `POST` | `/api/ai/knowledge-bases/{knowledgeBase}/documents/{documentId}/retry` | 对 `FAILED` 文档重新入库；对 `DELETE_FAILED` 文档重新删除 |
| `DELETE` | `/api/ai/knowledge-bases/{knowledgeBase}/documents/{documentId}` | 异步清理 Qdrant、源文件并标记删除 |

路径中的知识库必须与数据库记录一致。跨知识库读取、重试或删除返回资源不存在，避免泄露另一知识库的文档信息。

上传规则：

- 只允许文本型 `.pdf`、`.docx`、`.txt`、`.md`。
- 默认单文件最大 20 MB，通过 Spring multipart 和业务配置共同限制。
- 同一知识库内，SHA-256 相同且状态不是 `DELETED` 的文件视为重复上传。
- 原始文件名只作为展示元数据；磁盘路径必须由服务端 UUID 生成并校验仍位于配置根目录内。
- 只有管理员角色可以调用管理接口。普通医生和患者只能间接使用 Agent 检索结果。

## 6. MySQL 文档状态表

重新引入用途明确的 `ai_knowledge_documents` 表。该表只保存管理元数据，不保存正文或向量：

| 字段 | 用途 |
|---|---|
| `id` | 自增主键 |
| `document_id` | Java、Python、Qdrant 共用的 UUID，唯一索引 |
| `knowledge_base` | `MEDICAL_GENERAL` 或 `HOSPITAL_CUSTOM` |
| `original_name` | 管理端展示的原始文件名 |
| `storage_path` | Java 保存的相对路径 |
| `content_type` | 上传时确认的媒体类型 |
| `file_size` | 文件字节数 |
| `file_sha256` | 同知识库内重复检测 |
| `status` | 文档处理状态 |
| `chunk_count` | 成功写入的切片数量 |
| `error_message` | 安全化失败摘要 |
| `uploaded_by` | 上传管理员用户 ID |
| `created_at`、`updated_at` | 创建和更新时间 |
| `completed_at` | 最近一次成功入库时间 |
| `deleted_at` | 完成删除的时间 |

状态及允许迁移：

- 新上传：`PROCESSING -> READY | FAILED`
- 失败重试：`FAILED -> PROCESSING -> READY | FAILED`
- 删除：`READY | FAILED -> DELETING -> DELETED | DELETE_FAILED`
- 删除重试：`DELETE_FAILED -> DELETING -> DELETED | DELETE_FAILED`

服务重启后，超过配置时限仍为 `PROCESSING` 的记录改为 `FAILED`，错误原因为任务中断，管理员可通过重试接口恢复。

## 7. Python 内部接口与入库 Pipeline

Python 提供仅供 Java 调用的内部接口：

| 方法 | 路径 | 行为 |
|---|---|---|
| `POST` | `/v1/knowledge/ingest` | multipart 接收文件、`documentId`、`knowledgeBase` 和原始文件名 |
| `DELETE` | `/v1/knowledge/{knowledgeBase}/{documentId}` | 删除对应 Collection 内该文档的全部切片 |

两个接口都校验 Java 配置的内部 API Key。Python 再次校验知识库枚举、文件类型和大小，不能信任跨服务输入。

解析器：

- PDF 使用 `pypdf`，只接受能够提取文本的非加密 PDF。
- DOCX 使用 `python-docx`，保留标题和段落边界。
- TXT/Markdown 以 UTF-8 优先解码，拒绝无法可靠解码的文件。
- 空文档、扫描 PDF、加密 PDF 和没有有效正文的文件返回明确失败类型。

切片策略：

- 优先按标题和空行保持语义段落，超长段落再使用递归字符切分。
- `medical-general` 默认约 800 字符、重叠 120 字符。
- `hospital-custom` 默认约 500 字符、重叠 80 字符，使地点和步骤说明更集中。
- Embedding 分批调用，批大小通过配置控制。

每个 Qdrant Point 至少包含 `document_id`、`knowledge_base`、`original_name`、`chunk_index`、`text`、`content_hash` 和 `uploaded_at`。

## 8. 幂等、一致性与降级

- 入库或重试前，Python 按 `document_id` 清理目标 Collection 中的旧切片。
- 任一批次写入失败时，Python 清理该文档本次已经写入的所有切片，避免半份文档可检索。
- 删除是幂等操作；目标文档或 Collection 中的切片不存在也视为成功。
- `FAILED` 和 `DELETE_FAILED` 保留源文件，供重试使用。
- 只有 Qdrant 删除成功后，Java 才删除源文件并标记 `DELETED`。
- Qdrant 或 Embedding 在聊天检索时不可用，记录带意图和请求关联标识的降级日志，不让整个聊天接口崩溃。
- 医疗 Agent 在没有可用知识库依据时明确说明当前未检索到知识库资料，不伪造来源。
- 日志可以记录 `documentId`、知识库、文件大小、切片数和状态，不记录文档正文、Embedding 向量或内部 API Key。

## 9. 测试与验收

### 9.1 Java

- MockMvc 验证管理员上传、普通用户拒绝、非法知识库、错误扩展名、MIME 不匹配、超限、重复文件和路径安全。
- Service 测试验证状态迁移、异步成功、异步失败、失败重试、删除与删除重试。
- AI Client 测试验证 multipart 字段、内部认证、Python 错误映射和超时处理。
- Mapper 测试验证分页过滤、知识库隔离和 SHA-256 重复检测。

### 9.2 Python

- 解析器测试覆盖四种允许格式及空文档、加密/扫描 PDF、坏 DOCX、非法编码。
- 切片测试验证段落优先、大小边界、重叠和元数据完整性。
- Pipeline 测试验证两个知识库映射到不同 Collection、批量写入、失败清理和重试幂等。
- 检索测试验证 `medical_agent` 与 `registration_agent` 绝不串库，`chat_agent` 不调用 Embedding。
- 路由测试覆盖三种意图、低置信度 fallback、Tools 与 RAG 的组合，以及动态 Tool 数据优先规则。

### 9.3 端到端验收

- 从两个不同 URL 上传文档后，文档只存在于对应 Collection。
- 上传接口立即返回 `PROCESSING`，最终可查询为 `READY` 或带原因的 `FAILED`。
- medical 问题只引用通用医疗文档；院内导诊问题只引用医院定制文档。
- registration 分支可以在同一轮中使用医院知识片段和业务 Tool；发生冲突时采用 Tool 结果。
- chat 分支不产生任何知识库查询。
- 删除后 Qdrant 中不存在该 `document_id`，数据库状态为 `DELETED`，源文件已清理。

## 10. 非本期范围

- 管理员上传或管理前端。
- 扫描 PDF OCR、图片和音视频解析。
- MinIO、S3 或其他对象存储；首期使用 Java 本地可配置目录，并通过存储接口隔离未来替换。
- BM25、稀疏向量、重排模型和跨 Collection 聚合检索。
- 患者个人报告知识库、多医院租户和文档版本审批工作流。
