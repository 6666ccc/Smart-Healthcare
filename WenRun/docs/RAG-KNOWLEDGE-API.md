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

`status` 可省略，可选值为 `PROCESSING`、`READY`、`FAILED`、`DELETING`、`DELETE_FAILED`。

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
