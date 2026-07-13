# RAG 知识库管理 API

所有接口都要求登录用户具有 `admin` 角色。认证方式与其他 `/api/**` 接口一致。

`knowledgeBase` 只允许：

- `medical-general`：通用医疗知识库，对应 `medical_agent`。
- `hospital-custom`：医院定制知识库，对应 `registration_agent`。

## 上传文档

```http
POST /api/ai/knowledge-bases/{knowledgeBase}/documents
Content-Type: multipart/form-data
```

表单字段：`file`。允许文本型 PDF、DOCX、TXT、Markdown，默认最大 20 MB。

```bash
curl -X POST "http://localhost:8080/api/ai/knowledge-bases/medical-general/documents" \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@medical-guide.pdf"
```

接口立即返回异步状态：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "documentId": "8e0c62b9-c4d0-4bc6-9055-8897fef45b15",
    "knowledgeBase": "medical-general",
    "status": "PROCESSING"
  }
}
```

## 查询列表

```http
GET /api/ai/knowledge-bases/{knowledgeBase}/documents?status=READY&pageNum=1&pageSize=20
```

`status` 可省略，可选值为 `PROCESSING`、`READY`、`FAILED`、`DELETING`、`DELETE_FAILED`、`DELETED`。

## 查询详情

```http
GET /api/ai/knowledge-bases/{knowledgeBase}/documents/{documentId}
```

返回处理状态、切片数量及安全化失败原因，不返回服务端存储路径和文档正文。

## 重试

```http
POST /api/ai/knowledge-bases/{knowledgeBase}/documents/{documentId}/retry
```

- `FAILED`：重新解析并入库。
- `DELETE_FAILED`：重新清理 Qdrant 和源文件。

## 删除

```http
DELETE /api/ai/knowledge-bases/{knowledgeBase}/documents/{documentId}
```

删除为异步操作。状态先变为 `DELETING`，Qdrant 和源文件清理完成后变为 `DELETED`。

## 部署配置

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 20MB
      max-request-size: 21MB

ai:
  knowledge:
    storage:
      root: ./data/knowledge
      max-file-size: 20MB
    tasks:
      core-pool-size: 2
      max-pool-size: 4
      queue-capacity: 100
      stale-after: 30m
```

部署前执行 `docs/SQL/migration_add_ai_knowledge_documents.sql`。本期不支持管理员前端、扫描 PDF OCR、图片、音频或视频。

## AI 服务与双知识库配置

Java 与 Python 必须配置相同且非空的内部密钥：

```powershell
$env:WENRUN_AI_API_KEY = "替换为部署环境生成的强随机密钥"
```

Python AI 服务还需要配置 OpenAI 兼容模型与 Qdrant：

```text
OPENAI_API_KEY=...
OPENAI_BASE_URL=...
OPENAI_CHAT_MODEL=...
EMBEDDING_MODEL=...
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
WENRUN_API_KEY=与 WENRUN_AI_API_KEY 相同
KNOWLEDGE_TOP_K=5
KNOWLEDGE_SCORE_THRESHOLD=0.45
KNOWLEDGE_EMBEDDING_BATCH_SIZE=32
KNOWLEDGE_MAX_FILE_SIZE=20971520
```

Qdrant 集合与 Agent 的关系固定如下：

| 意图 | Agent | 知识库 | Qdrant 集合 | Tool |
| --- | --- | --- | --- | --- |
| 通用医疗科普 | `medical_agent` | `medical-general` | `wenrun_medical_general` | 无 |
| 医院定制服务、医生、地图、就诊步骤、挂号 | `registration_agent` | `hospital-custom` | `wenrun_hospital_custom` | 医院业务 Tool |
| 问候和闲聊 | `chat_agent` | 不检索 | 不检索 | 无 |

上传成功仅表示 Java 已创建异步任务；管理员应通过详情或列表接口等待状态变为 `READY`。若 Python 解析、Embedding 或 Qdrant 入库失败，状态会变为 `FAILED`，可调用重试接口重新执行。
