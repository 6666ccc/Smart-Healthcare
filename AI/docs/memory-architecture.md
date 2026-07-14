# AI 记忆与 RAG 四层架构设计

> 面向 WenRun 温润医院管理系统 — Python AI 服务侧  
> 状态：设计方案 | 最后更新：2026-06-17

---

## 目录

1. [架构全景图](#一架构全景图)
2. [第一层：文档级关联](#二第一层文档级关联)
3. [第二层：切片级关联](#三第二层切片级关联)
4. [第三层：MySQL 反向关联](#四第三层mysql-反向关联)
5. [第四层：时序关联](#五第四层时序关联)
6. [检索策略设计](#六检索策略设计)
7. [生命周期管理](#七生命周期管理)
8. [Collection 设计汇总](#八collection-设计汇总)

---

## 一、架构全景图

```
                         ┌─────────────────────────────┐
                         │      前端 (React / 小程序)      │
                         └─────────────┬───────────────┘
                                       │ HTTP
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Java 网关 (WenRun)                        │
│                                                                  │
│  AiChatController  ──→  POST /v1/chat  ──→  Python AI 服务        │
│  ChatMessageMapper                                      │         │
│  ReportService (删除联动)                                  │         │
│                                                                  │
│  ┌──────────────────┐                                          │
│  │  MySQL 业务数据库  │                                          │
│  │                  │                                          │
│  │  patient         │── patient_id (主键)                        │
│  │  registration    │                                          │
│  │  visit           │                                          │
│  │  prescription    │                                          │
│  │  chat_messages   │── conversation_id                          │
│  │  ai_knowledge    │── doc_id ←→ Qdrant 映射                   │
│  │  _documents (新)  │                                          │
│  └──────────────────┘                                          │
└──────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Python AI 服务 (wenrun_ai)                    │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ 记忆检索     │  │ 知识库 RAG   │  │ 用户画像               │ │
│  │ (conversation│  │ (document    │  │ (cross-session         │ │
│  │  memory)     │  │  knowledge)  │  │  profile)              │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘ │
│         │                 │                     │                │
│         └─────────────────┼─────────────────────┘                │
│                           │                                      │
│                           ▼                                      │
│              ┌────────────────────────┐                          │
│              │    Qdrant 向量数据库    │                          │
│              │                        │                          │
│              │  Collection 1:          │                          │
│              │   wenrun_chat_memory   │  会话记忆                 │
│              │                        │                          │
│              │  Collection 2:          │                          │
│              │   wenrun_user_profile  │  用户画像                 │
│              │                        │                          │
│              │  Collection 3:          │                          │
│              │   wenrun_knowledge     │  知识库文档               │
│              └────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

### 层级总览

| 层级 | 存储位置 | 存储内容 | 关联字段 |
|------|---------|---------|---------|
| **业务层** | MySQL | 患者姓名、年龄、主诉、报告状态、权限控制 | `patient_id`, `report_id` |
| **血缘层** | Qdrant (元数据) | 文档归属、切片序号、父ID、报告日期 | `doc_id`, `parent_id`, `chunk_index` |
| **向量层** | Qdrant (索引) | 原文的 Embedding 向量 + 原文截取片段 | `id` (自动生成) |
| **时间层** | Qdrant (元数据) | 报告日期、患者年龄、会话时间 | `report_date`, `created_at` |

---

## 二、第一层：文档级关联

> 核心原则：**绝对不能只存向量和原文，必须带上业务元数据标签。**

### 2.1 设计动机

如果只存 `{vector, text}`，当患者问"上次体检报告怎么说"时，系统只能做语义匹配，无法精确关联到"该患者"的"那份报告"的"特定版本"。

### 2.2 Point 数据结构

存入 Qdrant 的每条记录必须包含以下元数据字段：

```json
{
  "id": "chunk_a1b2c3",
  "vector": [0.1, 0.2, ...],
  "text": "患者舌苔发白，脉象细弱...",

  "doc_id": "REPORT_20260616_001",
  "patient_id": "P001",
  "file_name": "中医体质分析报告.pdf",
  "chunk_index": 3,
  "total_chunks": 15,
  "doc_type": "inspection_report",
  "parent_id": "parent_a1b2c3",
  "report_date": "2026-06-16",
  "source_type": "ai_generated",
  "is_primary": true
}
```

### 2.3 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `doc_id` | string | **是** | 关联到 MySQL 中具体的报告 ID，如 `REPORT_20260616_001` |
| `patient_id` | string | **是** | 关联到患者主索引，与 Java 侧 `patient.id` 对应 |
| `file_name` | string | 否 | 原始文件名，溯源用 |
| `doc_type` | string | **是** | 文档类型枚举（见下方） |
| `chunk_index` | int | **是** | 当前是第几个切片（从 0 计数） |
| `total_chunks` | int | **是** | 该文档总共切成几块 |
| `parent_id` | string | 否 | 指向父切片的 ID（子切片专用） |
| `report_date` | string | 否 | ISO 日期，报告产生时间 |
| `source_type` | string | 否 | `manual` / `ai_generated` / `ocr` / `imported` |
| `is_primary` | bool | 否 | 是否标记为主要结果，检索时可加权 |

### 2.4 `doc_type` 枚举

| 值 | 说明 | 示例 |
|----|------|------|
| `inspection_report` | 检验/检查报告 | 血常规、CT、B 超 |
| `prescription` | 处方记录 | 门诊处方、中药方 |
| `visit_record` | 就诊记录 | 门诊病历 |
| `tongue_analysis` | 舌苔分析 | AI 舌诊报告 |
| `medical_guideline` | 诊疗指南 | 高血压诊疗规范 |
| `drug_instruction` | 药品说明书 | 阿莫西林说明书 |
| `hospital_policy` | 医院制度 | 医保报销规定 |
| `faq` | 常见问题 | 患者咨询 FAQ |

### 2.5 代码衔接

当前 [wenrun_ai/memory/store.py](../wenrun_ai/memory/store.py#L136-L185) 的 `add_memory()` 已存储 `conversation_id`、`user_id`、`role`、`content`、`created_at` 五个字段。需要扩展 Point payload 以支持上述元数据标签。

---

## 三、第二层：切片级关联

> 核心原则：**父子切片机制 — 子切片精细命中，父切片提供完整上下文。**

### 3.1 问题场景

传统 RAG 将文档切成等长片段（如 256 字符），但：

- 切片 "数值偏高" 脱离了上下文，不知道是什么项目偏高
- 切片 "建议随访" 脱离了上文，不知道该做什么随访

**解决方案**：引入父子切片：

```
┌─────────────────────────────────────────────┐
│ 父切片 (512 字符) — 完整的段落上下文           │
│ "血常规检查结果：白细胞计数 12.5×10⁹/L，       │
│  高于正常范围(4.0-10.0)，中性粒细胞比例 78%，  │
│  提示可能存在细菌感染。建议结合临床症状，        │
│  必要时使用抗生素治疗并3天后复查血常规。"        │
├─────────────────────────────────────────────┤
│  ├─ 子切片 0 (128 字符):                     │
│  │  "血常规检查结果：白细胞计数 12.5×10⁹/L，   │
│  │   高于正常范围(4.0-10.0)"                  │
│  │  → 命中关键词 "白细胞高"、"血常规异常"      │
│  │                                           │
│  └─ 子切片 1 (128 字符):                     │
│     "中性粒细胞比例 78%，提示可能存在细菌感染。  │
│      建议结合临床症状，必要时使用抗生素治疗"      │
│     → 命中关键词 "细菌感染"、"抗生素"           │
└─────────────────────────────────────────────┘
```

### 3.2 切片策略

| 参数 | 父切片 | 子切片 | 说明 |
|------|--------|--------|------|
| 大小 | 512 字符 | 128 字符 | 可按文档类型调整 |
| 重叠 | 50 字符 | 30 字符 | 防止边界截断 |
| 是否参与检索 | 是 | 是（补充） | 两者都入向量库 |
| 检索命中后 | 直接返回 | **通过 `parent_id` 调取父切片** | 子命中 → 父返回 |

### 3.3 检索时的父切片还原

```
用户提问："白细胞高怎么回事？"
    │
    ▼
向量检索 → 命中子切片 0（相似度 0.92）
    │
    ▼
读取子切片 0 的 payload.parent_id = "parent_xyz"
    │
    ▼
按 parent_id 检索父切片 → 获取完整 512 字符段落
    │
    ▼
注入 Agent Prompt（含完整上下文）
```

### 3.4 不同文档类型的推荐切分方式

| doc_type | 切分方式 | 父切片大小 | 理由 |
|----------|---------|-----------|------|
| `inspection_report` | 按检查项目切 | 512 | 一个项目（如血常规）通常 200-400 字 |
| `visit_record` | 按 SOAP 结构切 | 512 | 主诉/查体/诊断/处理各有独立语义 |
| `drug_instruction` | 按章节切 | 512 | 适应症/用法/禁忌/不良反应 |
| `medical_guideline` | 按疾病+分期 | 768 | 指南段落较长，需更大窗口 |
| `tongue_analysis` | 按分析维度切 | 256 | 舌色/舌苔/舌形各有独立描述 |
| `hospital_policy` | 按条款切 | 384 | 每条政策独立成段 |

---

## 四、第三层：MySQL 反向关联

> 核心原则：**向量数据库只存 "向量 + ID + 元数据标签"，任何需要修改、统计、列表展示的数据全放 MySQL。**

### 4.1 职责分离

```
        Qdrant 职责                    MySQL 职责
┌──────────────────────────┐  ┌──────────────────────────┐
│ • 向量相似度搜索          │  │ • 患者信息 CRUD           │
│ • 语义检索                │  │ • 报告状态管理            │
│ • 元数据 Filter 过滤       │  │ • 权限校验                │
│ • Top-K 排序              │  │ • 数据统计                │
│                          │  │ • 关联关系维护            │
│ 存：vector + text +       │  │ • 逻辑删除                │
│     doc_id + patient_id   │  │                          │
│     + chunk_index + ...   │  │ 存：完整业务实体           │
└──────────────────────────┘  └──────────────────────────┘
         │                            │
         └──── doc_id / patient_id ────┘
              (双向映射键)
```

### 4.2 查询流程

```
用户提问："老王最近的体检怎么样？"
         │
         ▼
┌─ Step 1: Java 查 MySQL ──────────────────────────┐
│  SELECT id, patient_no FROM patient               │
│  WHERE name = '老王'                              │
│  → patient_id = 5, patient_no = "P001"            │
│  → 注入 ChatRequest { patientId: 5, ... }         │
└───────────────────────────────────────────────────┘
         │
         ▼
┌─ Step 2: Python 查 Qdrant ───────────────────────┐
│  search_knowledge(                                │
│    query = "体检报告异常指标",                       │
│    filters = {                                     │
│      "patient_id": "P001",                         │
│      "doc_type": "inspection_report",              │
│      "report_date": {"gte": "2026-05-16"}          │
│    }                                               │
│  )                                                 │
│  → [{doc_id: "REPORT_001", text: "...", score},..] │
└───────────────────────────────────────────────────┘
         │
         ▼
┌─ Step 3: Agent 回复 ──────────────────────────────┐
│  "根据您6月16日的体检报告，肝功能指标中ALT偏高..."     │
│  回复中可附带 doc_id，前端据此展示"查看完整报告"链接    │
└───────────────────────────────────────────────────┘
```

### 4.3 MySQL 映射表设计

```sql
-- 知识库文档索引表（Java 侧新建）
CREATE TABLE ai_knowledge_documents (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    doc_id          VARCHAR(64)  NOT NULL UNIQUE COMMENT 'Qdrant 中的文档唯一标识',
    patient_id      BIGINT       COMMENT '关联患者 ID',
    report_id       BIGINT       COMMENT '关联业务报告 ID（可为空）',
    doc_type        VARCHAR(32)  NOT NULL COMMENT '文档类型枚举',
    file_name       VARCHAR(255) COMMENT '原始文件名',
    total_chunks    INT          NOT NULL DEFAULT 0 COMMENT '切片总数',
    source_type     VARCHAR(16)  NOT NULL DEFAULT 'manual' COMMENT '来源',
    status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1=有效 0=已删除',
    qdrant_sync_at  DATETIME     COMMENT 'Qdrant 最近同步时间',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_patient (patient_id),
    INDEX idx_doc_type_status (doc_type, status),
    INDEX idx_report (report_id),
    INDEX idx_status_sync (status, qdrant_sync_at)
) COMMENT 'AI 知识库文档索引 — 桥接 MySQL 业务数据与 Qdrant 向量库';
```

---

## 五、第四层：时序关联

> 核心原则：**体检报告最看重趋势。用 `report_date` 过滤时间窗口，天然按时间排序。**

### 5.1 设计动机

- "肝功能最近一个月怎么样了？" → 需要 `report_date >= 30天前`
- "今年的血压控制得好吗？" → 需要 `report_date >= 今年1月1日`
- "比较一下这两次的血糖结果" → 需要按 `report_date` 排序返回最近 N 条

### 5.2 Filter 前置原则

**关键规则**：查询时，先过滤元数据（缩小范围），再做向量相似度搜索。

```
正确做法 ✅：
  1. Filter: patient_id = P001 AND doc_type = inspection_report AND report_date >= 2026-05-16
  2. 在过滤后的子集中做向量相似度搜索
  3. 返回 Top-K

错误做法 ❌：
  1. 全库向量搜索
  2. 返回后根据元数据过滤
  → 性能差，结果不准（可能与更老的报告匹配但无法通过 Filter）
```

### 5.3 代码实现

```python
def search_patient_trend(
    patient_id: str,
    query: str,
    *,
    months: int = 1,
    top_k: int = 5,
) -> list[dict]:
    """时序关联检索：只看指定时间窗口内的相关报告。"""
    from datetime import datetime, timedelta

    cutoff_date = (
        datetime.now() - timedelta(days=months * 30)
    ).strftime("%Y-%m-%d")

    results = client.query_points(
        collection_name=KNOWLEDGE_COLLECTION,
        query=embed_query(query),
        query_filter=Filter(must=[
            FieldCondition(
                key="patient_id",
                match=MatchValue(value=patient_id),
            ),
            FieldCondition(
                key="report_date",
                range=Range(gte=cutoff_date),
            ),
        ]),
        limit=top_k,
    )

    # 按时间降序排列，最新报告优先
    return sorted(
        [
            {
                "doc_id": h.payload["doc_id"],
                "text": h.payload["text"],
                "report_date": h.payload["report_date"],
                "doc_type": h.payload["doc_type"],
                "score": h.score,
            }
            for h in results.points if h.payload
        ],
        key=lambda x: x["report_date"],
        reverse=True,
    )
```

### 5.4 年龄关联

体检指标的"正常范围"与年龄相关。建议在元数据中存储患者当时的年龄：

```python
# 存入时
{
    "report_date": "2026-06-16",
    "patient_age_at_report": 35,  # 报告时患者的年龄
    # 用途：检索时可过滤 "age >= 60" 只看老年患者标准
}
```

---

## 六、检索策略设计

### 6.1 当前检索流程

```
用户提问
  → embed_query(text)
  → Qdrant.query_points(vector, filter={conversation_id}, limit=5)
  → format_memories_for_prompt()
  → 注入 Prompt
```

代码位置：[wenrun_ai/chains/qa.py](../wenrun_ai/chains/qa.py#L163-L166)  
代码位置：[wenrun_ai/memory/store.py](../wenrun_ai/memory/store.py#L251-L311)

### 6.2 改进后的多路检索流程

```
用户提问
  │
  ├─ 并行检索 ──────────────────────────────────┐
  │                                             │
  ├─→ search_memories(conversation_id, query)    │  ← 会话记忆 (已有)
  │   Qdrant: wenrun_chat_memory                │
  │   Filter: {conversation_id}                  │
  │                                             │
  ├─→ search_knowledge(patient_id, query, time)  │  ← 知识库 (新增)
  │   Qdrant: wenrun_knowledge                  │
  │   Filter: {patient_id, doc_type, report_date}│
  │                                             │
  └─→ get_user_profile(user_id)                  │  ← 用户画像 (新增)
      Qdrant: wenrun_user_profile               │
      Filter: {user_id}                          │
  │                                             │
  └──────────────────────────────────────────────┘
  │
  ▼
分别格式化 → 注入 Prompt 不同区域
  │
  ├─ <user_profile>      画像信息
  ├─ <relevant_knowledge> 相关文档片段
  └─ <conversation_memory> 历史对话
  │
  ▼
Agent 作答 → 回存记忆
```

### 6.3 混合检索 (BM25 + Dense)

**Phase 3 引入**。Qdrant 1.10+ 原生支持。

```python
# 双路召回 + RRF (Reciprocal Rank Fusion) 融合
results = client.query_points(
    collection_name=KNOWLEDGE_COLLECTION,
    prefetch=[
        # 路 1: 稠密向量 (语义)
        models.Prefetch(
            query=embed_query(query),
            using="dense",
            limit=20,
        ),
        # 路 2: 稀疏向量 (关键词)
        models.Prefetch(
            query=models.SparseVector(
                indices=bm25_indices,
                values=bm25_values,
            ),
            using="sparse",
            limit=20,
        ),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    limit=top_k,
)
```

BM25 对**医学专有名词、药名、诊断码**的精确匹配能力远强于纯语义检索。

### 6.4 记忆去重

写入前检查相似度，避免重复存储：

```python
def add_memory_with_dedup(
    conversation_id: str,
    user_id: int | None,
    role: str,
    content: str,
    dedup_threshold: float = 0.95,
) -> str | None:
    """带去重的记忆写入。如果与已有记忆高度相似，跳过新增。"""
    # 先检索最相似的已有记忆
    existing = search_memories(conversation_id, content, top_k=1)
    if existing and existing[0]["score"] >= dedup_threshold:
        logger.debug("记忆去重跳过 | conv=%s | score=%.3f", conversation_id, existing[0]["score"])
        return None  # 跳过，不重复写入

    return add_memory(conversation_id, user_id, role, content)
```

### 6.5 记忆重要性评分

LLM 在存储时对每条记忆打分 1-5，检索时加权：

```python
# 存入时 LLM 打分
memory_importance_prompt = """
请评估以下对话片段的"长期记忆重要性"（1-5 分）：
- 5 分：关乎患者健康安全的过敏史、重大诊断、关键医嘱
- 4 分：慢性病进展描述、用药调整、检查异常结果
- 3 分：一般性症状描述、常规问诊
- 2 分：预约挂号、缴费、行政类
- 1 分：寒暄、闲聊、非医疗内容

对话："{content}"
只回复数字。
"""

# 检索时加权: score * (1 + 0.2 * importance)
```

---

## 七、生命周期管理

### 7.1 记忆生命周期策略

| 策略 | 触发时机 | 实现 |
|------|---------|------|
| **TTL 过期** | 自动 | Qdrant payload `expire_at`，会话记忆 90 天后自动清理 |
| **去重** | 写入前 | 相似度 > 0.95 则跳过 |
| **对话摘要** | 会话关闭/消息达到阈值 | LLM 摘要 → 存入 `user_profile`，原始片段标记可淘汰 |
| **逻辑删除** | 用户操作 | MySQL `is_deleted=1` + Qdrant 按 `doc_id` 批量删除 |

### 7.2 删除联动

当用户在业务界面点击 "删除报告" 时，必须触发两件事：

```
┌──────────────────────────────────────────────────┐
│  Java: ReportServiceImpl.deleteReport(id)         │
│                                                   │
│  @Transactional                                    │
│  public void deleteReport(Long reportId) {        │
│      // 1. MySQL 逻辑删除                          │
│      reportMapper.softDelete(reportId);           │
│                                                   │
│      // 2. 标记索引表                             │
│      knowledgeDocMapper.markDeleted(reportId);    │
│                                                   │
│      // 3. 通知 AI 服务清理 Qdrant                │
│      aiServiceClient.deleteKnowledge(             │
│          "REPORT_" + reportId                     │
│      );                                           │
│  }                                                │
└──────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Python: DELETE /v1/knowledge/{doc_id}            │
│                                                   │
│  client.delete(                                   │
│      collection_name=KNOWLEDGE_COLLECTION,        │
│      points_selector=FilterSelector(              │
│          filter=Filter(must=[                     │
│              FieldCondition(                      │
│                  key="doc_id",                    │
│                  match=MatchValue(value=doc_id),  │
│              )                                    │
│          ])                                       │
│      ),                                           │
│  )                                                │
└──────────────────────────────────────────────────┘
```

### 7.3 命名规范

- 元数据字段名**全小写 + 下划线**（如 `report_date`、`doc_type`）
- 原因：Qdrant / Milvus 等向量库对大小写敏感，统一小写避免兼容问题
- `doc_id` 格式建议：`{TYPE}_{TIMESTAMP}_{SEQ}`，如 `REPORT_20260616_001`

---

## 八、Collection 设计汇总

### 8.1 `wenrun_chat_memory`（已有）

| 项目 | 值 |
|------|-----|
| 用途 | 会话级对话记忆，语义检索历史对话 |
| 向量维度 | 由 Embedding 模型自动探测 |
| 距离度量 | Cosine |
| 主要 Filter | `conversation_id` |
| TTL | 90 天（建议新增） |

**Payload 字段**：

| 字段 | 类型 | 说明 | 状态 |
|------|------|------|------|
| `conversation_id` | string | 会话 ID | ✅ 已有 |
| `user_id` | integer | 用户 ID | ✅ 已有 |
| `role` | string | user / assistant | ✅ 已有 |
| `content` | string | 消息文本 | ✅ 已有 |
| `created_at` | datetime | ISO 时间戳 | ✅ 已有 |
| `importance` | integer | 重要性 1-5 | 🔲 待加 |
| `expire_at` | datetime | TTL 过期时间 | 🔲 待加 |

### 8.2 `wenrun_user_profile`（新增）

| 项目 | 值 |
|------|-----|
| 用途 | 用户级持久画像，跨会话记忆 |
| 向量维度 | 由 Embedding 模型自动探测 |
| 距离度量 | Cosine |
| 主要 Filter | `user_id`, `profile_type` |
| TTL | 无（永久有效，手动管理） |

**Payload 字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | integer | 用户 ID |
| `profile_type` | string | allergy / chronic_disease / medication / preference / summary |
| `content` | string | 画像内容 |
| `source_conversation_id` | string | 来源会话（可溯源） |
| `confidence` | float | LLM 提取置信度 |
| `updated_at` | datetime | 更新时间 |

### 8.3 `wenrun_knowledge`（新增）

| 项目 | 值 |
|------|-----|
| 用途 | 知识库文档语义检索 |
| 向量维度 | 由 Embedding 模型自动探测 |
| 距离度量 | Cosine |
| 主要 Filter | `patient_id`, `doc_type`, `report_date`, `is_primary` |
| TTL | 无（由业务逻辑显式删除） |

**Payload 字段**（完整四层元数据）：

| 字段 | 类型 | 层级 | 说明 |
|------|------|------|------|
| `doc_id` | string | 第一层 | 文档唯一标识，对应 MySQL `ai_knowledge_documents.doc_id` |
| `patient_id` | string | 第一层 | 患者 ID |
| `file_name` | string | 第一层 | 原始文件名 |
| `doc_type` | string | 第一层 | 文档类型枚举 |
| `chunk_index` | integer | 第一层 | 切片序号 |
| `total_chunks` | integer | 第一层 | 文档总切片数 |
| `parent_id` | string | **第二层** | 父切片 ID（子切片指向父切片） |
| `report_date` | string | **第四层** | 报告日期，ISO 格式 |
| `source_type` | string | — | manual / ai_generated / ocr |
| `is_primary` | boolean | — | 是否为主要结果 |
| `text` | string | 向量层 | 原文截取片段 |
| `content_hash` | string | — | 文本哈希（去重用） |

---

## 附录 A：与现有文档的关系

| 文档 | 面向对象 | 内容 |
|------|---------|------|
| [memory.md](memory.md) | Java 开发 | Java 侧配合说明、conversationId 传递约定 |
| [memory2.md](memory2.md) | Python AI 开发 | Java 侧已完成的变更交底 |
| **本文** | Python AI 开发 + 架构师 | 四层架构设计、检索策略、Collection 设计、生命周期管理 |

## 附录 B：当前代码现状 vs 设计目标

| 能力 | 当前状态 | 设计目标 |
|------|---------|---------|
| 会话记忆检索 | ✅ 已实现 | 保持 + 加去重/重要性/TTL |
| 文档级元数据 | ⚠️ 仅基础字段 | 扩展为完整四层元数据 |
| 父子切片 | ❌ 未实现 | 按文档类型差异化切分 |
| 知识库 RAG | ❌ 未实现 | 新增 wenrun_knowledge collection |
| 用户画像 | ❌ 未实现 | 新增 wenrun_user_profile collection |
| MySQL 反向关联 | ⚠️ 部分（chat_messages 表） | 新增 ai_knowledge_documents 表 |
| 时序检索 | ⚠️ 仅 created_at | 加 report_date + 时间范围 Filter |
| 删除联动 | ❌ 未实现 | Java ↔ Python 双向联动 |
| 混合检索 | ❌ 未实现 | BM25 + Dense + RRF |
| 多路并行检索 | ❌ 未实现 | asyncio.gather 并行查三路 |
| 反馈闭环 | ❌ 未实现 | 👍/👎 → 调整检索权重 |
