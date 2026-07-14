# AI 记忆与 RAG — 实现路线图

> 面向 WenRun 温润医院管理系统 — Python AI 服务侧  
> 前置阅读：[memory-architecture.md](memory-architecture.md)  
> 状态：规划中 | 最后更新：2026-06-17

---

## 总体路线

```
Phase 1 (1-2 周)         Phase 2 (2-3 周)         Phase 3 (3-4 周)
夯实基础                  引入知识库 RAG            智能记忆
───────────────────────  ───────────────────────  ───────────────────────
• 代码拆包重构             • 知识库 Collection        • 用户画像
• 记忆去重                • 文档入库 Pipeline        • 混合检索 (BM25+Dense)
• TTL 机制                • 父子切片策略             • Cross-Encoder 精排
• 双路并行检索             • MySQL 映射表             • 记忆重要性评分
                          • 删除联动接口             • 反馈闭环
                          • 时序过滤检索
```

---

## Phase 1：夯实基础 (1-2 周)

### P1-1：代码拆包重构

**目标**：当前 `store.py` 已 454 行，拆分为独立模块便于后续扩展。

**当前结构 → 目标结构**：

```
wenrun_ai/memory/
├── __init__.py          # 公开 API（不变）
├── embeddings.py        # Embedding 调用（从 store.py 抽出）
├── store.py             # 核心读写（保留，精简）
├── retriever.py         # 检索策略（新增）
├── manager.py           # 生命周期管理（新增：去重/TTL/摘要）
└── health.py            # 健康检查（从 store.py 抽出）
```

**涉及文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `wenrun_ai/memory/embeddings.py` | 新增 | `embed_query()`, `embed_documents()`, `_get_embedding_api_info()`, `_call_embedding_api()` |
| `wenrun_ai/memory/store.py` | 修改 | 删除 Embedding 相关函数，import 新模块 |
| `wenrun_ai/memory/retriever.py` | 新增 | `search_memories()`, `format_memories_for_prompt()`（从 store.py 迁移） |
| `wenrun_ai/memory/manager.py` | 新增 | 去重/TTL/摘要相关函数 |
| `wenrun_ai/memory/health.py` | 新增 | `check_memory_health()`, `_get_collection_info()` |
| `wenrun_ai/memory/__init__.py` | 修改 | 更新 import 路径 |

### P1-2：记忆去重

**目标**：写入前与已有记忆做相似度检查，> 0.95 则跳过。

**实现位置**：`wenrun_ai/memory/manager.py`

```python
DEDUP_THRESHOLD = 0.95

def add_memory_with_dedup(
    conversation_id: str,
    user_id: int | None,
    role: str,
    content: str,
    threshold: float = DEDUP_THRESHOLD,
) -> str | None:
    """带去重的记忆写入。与已有记忆高度相似时跳过新增，避免重复存储。"""
    existing = search_memories(conversation_id, content, top_k=1)
    if existing and existing[0]["score"] >= threshold:
        return None  # 跳过
    return add_memory(conversation_id, user_id, role, content)
```

**对调用方的影响**：`qa.py` 中 `add_memory_pair()` 改为调用 `add_memory_pair_with_dedup()`。

### P1-3：TTL 机制

**目标**：会话记忆 90 天自动过期，避免 Qdrant 无限增长。

**实现方式**：在 Payload 中添加 `expire_at` 字段，由定时任务或写入时清理。

```python
# 写入时附带 TTL
def add_memory(..., ttl_days: int = 90):
    expire_at = (datetime.now(timezone.utc) + timedelta(days=ttl_days)).isoformat()
    payload["expire_at"] = expire_at
    ...

# 定时清理（可通过 uvicorn 的 lifespan 注册后台任务）
async def cleanup_expired_memories():
    """每 1 小时执行一次，删除过期记忆。"""
    client.delete(
        collection_name=collection_name,
        points_selector=FilterSelector(
            filter=Filter(must=[
                FieldCondition(
                    key="expire_at",
                    range=Range(lt=datetime.now(timezone.utc).isoformat()),
                )
            ])
        ),
    )
```

**注意**：`wenrun_user_profile` 和 `wenrun_knowledge` 两个 Collection **不设自动 TTL**，由业务逻辑显式管理生命周期。

### P1-4：双路并行检索

**目标**：单次查询同时检索记忆和用户画像，减少延迟。

**实现位置**：`wenrun_ai/memory/retriever.py`

```python
import asyncio

async def hybrid_retrieve(
    conversation_id: str,
    user_id: int | None,
    query: str,
    top_k: int = 5,
) -> RetrievalResult:
    """并行检索：会话记忆 + 用户画像。"""
    memories_task = asyncio.create_task(
        asyncio.to_thread(search_memories, conversation_id, query, top_k)
    )
    profile_task = asyncio.create_task(
        asyncio.to_thread(get_user_profile, user_id) if user_id else asyncio.sleep(0)
    )

    memories = await memories_task
    profile = await profile_task if user_id else None

    return RetrievalResult(
        memories_block=format_memories_for_prompt(memories),
        profile_block=format_profile_for_prompt(profile),
    )
```

**对调用方的影响**：`qa.py` 中 `run_chat()` 和 `aiter_chat_events()` 的检索部分需要改为 async。

---

## Phase 2：引入知识库 RAG (2-3 周)

### P2-1：新增 `wenrun_knowledge` Collection

**目标**：在 Qdrant 中创建知识库专用 Collection。

**实现位置**：`wenrun_ai/memory/knowledge.py`（新增）

```python
KNOWLEDGE_COLLECTION = "wenrun_knowledge"

def ensure_knowledge_collection():
    """创建或确认知识库 Collection 存在。"""
    client = _get_client()
    existing = {c.name for c in client.get_collections().collections}
    if KNOWLEDGE_COLLECTION not in existing:
        vector_size = _get_vector_size()
        client.create_collection(
            collection_name=KNOWLEDGE_COLLECTION,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
```

### P2-2：文档入库 Pipeline

**目标**：将医疗文档解析 → 切片 → Embedding → 写入 Qdrant。

**Pipeline 流程**：

```
PDF / 文本 / 数据库
  │
  ▼
文档解析器 (按类型分发)
  │
  ├─ inspection_report  → 按检查项目提取
  ├─ drug_instruction   → 按章节拆分
  ├─ visit_record       → 按 SOAP 拆分
  ├─ tongue_analysis    → 按分析维度拆分
  ├─ medical_guideline  → 按疾病+分期拆分
  └─ hospital_policy    → 按条款拆分
  │
  ▼
父子切片器 (chunking.py)
  │
  ▼
批量 Embedding (embeddings.py)
  │
  ▼
批量写入 Qdrant
```

**核心函数签名**：

```python
# wenrun_ai/memory/pipeline.py (新增)

def ingest_document(
    text: str,
    doc_id: str,
    patient_id: str,
    doc_type: str,
    *,
    file_name: str = "",
    report_date: str | None = None,
    source_type: str = "manual",
    chunk_config: dict | None = None,  # 按 doc_type 覆盖默认切分配置
) -> IngestResult:
    """将一份文档完整入库。

    Returns:
        IngestResult(chunks_inserted=12, parent_chunks=4, child_chunks=8, doc_id=...)
    """
```

### P2-3：父子切片策略

**目标**：按文档类型差异化切分，子切片命中后调取父切片完整上下文。

**实现位置**：`wenrun_ai/memory/chunking.py`（新增）

```python
# 各文档类型的推荐切分配置
CHUNK_CONFIGS = {
    "inspection_report": {
        "parent_size": 512, "child_size": 128, "overlap": 50,
        "split_strategy": "by_item",  # 按检查项目切分
    },
    "visit_record": {
        "parent_size": 512, "child_size": 128, "overlap": 50,
        "split_strategy": "by_soap",  # Subjective/Objective/Assessment/Plan
    },
    "drug_instruction": {
        "parent_size": 512, "child_size": 128, "overlap": 30,
        "split_strategy": "by_section",  # 按标题切分
    },
    "medical_guideline": {
        "parent_size": 768, "child_size": 192, "overlap": 80,
        "split_strategy": "by_section",
    },
    "tongue_analysis": {
        "parent_size": 256, "child_size": 96, "overlap": 40,
        "split_strategy": "by_dimension",  # 舌色/舌苔/舌形
    },
    "hospital_policy": {
        "parent_size": 384, "child_size": 128, "overlap": 40,
        "split_strategy": "by_clause",
    },
}

def chunk_document(text: str, doc_type: str) -> list[ChunkPair]:
    """根据文档类型选择切分策略，返回父子切片对列表。"""
    config = CHUNK_CONFIGS.get(doc_type, CHUNK_CONFIGS["inspection_report"])
    ...
```

**检索时父切片还原**：

```python
def resolve_to_parent(child_hit) -> dict | None:
    """子切片命中 → 通过 parent_id 调取父切片的完整段落。"""
    parent_id = child_hit.payload.get("parent_id")
    if not parent_id:
        return child_hit  # 本身就是父切片

    parent_points = client.retrieve(
        collection_name=KNOWLEDGE_COLLECTION,
        ids=[parent_id],
    )
    if parent_points:
        return {
            "text": parent_points[0].payload["text"],
            "doc_id": parent_points[0].payload["doc_id"],
            "score": child_hit.score,
        }
    return None
```

### P2-4：MySQL 映射表 + Java 配合

**目标**：打通 Qdrant `doc_id` ↔ MySQL 业务数据。

**Java 侧需要的变更**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `docs/SQL/wenrun.sql` | 修改 | 新增 `ai_knowledge_documents` 建表语句 |
| `src/.../entity/AiKnowledgeDocument.java` | 新增 | 实体 |
| `src/.../mapper/AiKnowledgeDocumentMapper.java` | 新增 | Mapper |
| `src/.../resources/mapper/AiKnowledgeDocumentMapper.xml` | 新增 | SQL 映射 |
| `src/.../service/AiKnowledgeDocService.java` | 新增 | 服务接口 |
| `src/.../service/impl/AiKnowledgeDocServiceImpl.java` | 新增 | 实现 |
| `src/.../ai/client/AiServiceClient.java` | 修改 | 新增 `deleteKnowledge(docId)` 方法 |

### P2-5：删除联动接口

**目标**：Java 删除报告时，Python 侧同步清理 Qdrant 向量。

**Python 侧新增路由**：

```python
# wenrun_ai/API/routers/knowledge.py (新增)

from fastapi import APIRouter

router = APIRouter()

@router.delete("/knowledge/{doc_id}")
def delete_knowledge(doc_id: str) -> dict:
    """Java 侧删除报告时调用，清理 Qdrant 中的相关向量。

    调用方: Java ReportService.deleteReport()
    """
    client = _get_client()

    # 按 doc_id 批量删除该文档的所有切片（父+子）
    from qdrant_client.models import FilterSelector

    client.delete(
        collection_name=KNOWLEDGE_COLLECTION,
        points_selector=FilterSelector(
            filter=Filter(must=[
                FieldCondition(key="doc_id", match=MatchValue(value=doc_id)),
            ])
        ),
    )

    logger.info("已清理知识库文档 | doc_id=%s", doc_id)
    return {"status": "deleted", "doc_id": doc_id}


@router.post("/knowledge/ingest")
def ingest_knowledge(body: KnowledgeIngestRequest) -> dict:
    """Java 侧生成报告后调用，将报告内容入库为知识。

    调用方: Java ReportService 异步通知 或 手动触发
    """
    result = ingest_document(
        text=body.content,
        doc_id=body.doc_id,
        patient_id=body.patient_id,
        doc_type=body.doc_type,
        file_name=body.file_name or "",
        report_date=body.report_date,
        source_type=body.source_type or "ai_generated",
    )
    return {"status": "ingested", "doc_id": body.doc_id, "chunks": result.chunks_inserted}
```

**在 `app.py` 中注册路由**：

```python
# wenrun_ai/API/app.py 增加
from .routers import knowledge as knowledge_router
application.include_router(knowledge_router.router, prefix="/v1", tags=["knowledge"])
```

### P2-6：时序过滤检索

**目标**：支持按 `report_date` 时间窗口过滤检索。

已在 [memory-architecture.md 第五层](memory-architecture.md#五第四层时序关联) 详述，关键点：

- Filter 前置：`patient_id` + `report_date range` 先缩小范围
- 按 `report_date` 降序排列结果
- 支持 `patient_age_at_report` 字段存储报告时年龄

---

## Phase 3：智能记忆 (3-4 周)

### P3-1：用户画像自动抽取

**目标**：从对话中自动提取结构化信息，更新用户画像。

**实现位置**：`wenrun_ai/memory/profile.py`（新增）

```python
# 画像字段定义
PROFILE_FIELDS = [
    ("allergies", "过敏史信息"),
    ("chronic_diseases", "慢性病史"),
    ("current_medications", "当前用药"),
    ("recent_symptoms", "近期症状"),
    ("family_history", "家族史"),
    ("lifestyle_notes", "生活习惯备注"),
]

def extract_profile_updates(
    conversation_text: str,
    user_id: int,
    llm,
) -> list[ProfileUpdate]:
    """用 LLM 从对话中抽取结构化画像更新。

    Returns:
        [
            ProfileUpdate(field="allergies", value="青霉素过敏", confidence=0.95),
            ProfileUpdate(field="current_medications", value="硝苯地平 30mg qd", confidence=0.85),
        ]
    """

def apply_profile_updates(updates: list[ProfileUpdate]) -> None:
    """将抽取的更新写入 wenrun_user_profile collection。
    对于已有画像字段，LLM 判断是追加、更新还是冲突（保留最新）。
    """
```

### P3-2：混合检索 (BM25 + Dense + RRF)

**目标**：解决医学专有名词（药名、诊断码、科室名）的精确匹配问题。

**依赖**：Qdrant 1.10+ 或配置 Sparse Vector。

```python
# 需要先创建 sparse vector 索引
client.create_collection(
    collection_name=KNOWLEDGE_COLLECTION,
    vectors_config={
        "dense": VectorParams(size=vector_size, distance=Distance.COSINE),
    },
    sparse_vectors_config={
        "sparse": SparseVectorParams(
            index=SparseIndexParams(
                on_disk=False,
            )
        ),
    },
)

# 写入时同时存两路向量
client.upsert(
    collection_name=KNOWLEDGE_COLLECTION,
    points=[PointStruct(
        id=point_id,
        vector={"dense": dense_vector, "sparse": bm25_sparse_vector},
        payload={...},
    )],
)

# 检索时 RRF 融合
results = client.query_points(
    collection_name=KNOWLEDGE_COLLECTION,
    prefetch=[
        models.Prefetch(query=dense_vector, using="dense", limit=20),
        models.Prefetch(query=bm25_sparse, using="sparse", limit=20),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    limit=top_k,
)
```

**评估指标**：

| 指标 | 纯 Dense | Dense + BM25 (RRF) | 目标 |
|------|---------|-------------------|------|
| 药名精确匹配命中率 | ~60% | ~90% | >85% |
| 诊断码检索准确率 | ~50% | ~85% | >80% |
| 平均检索延迟 | ~50ms | ~80ms | <150ms |

### P3-3：Cross-Encoder 精排

**目标**：粗召回 20 条 → Cross-Encoder 精排 Top-3，提升最终注入 Prompt 的记忆质量。

```python
# 可选方案：
# 方案 A: 用 LLM API 做精排（成本低，延迟 ~200ms）
# 方案 B: 部署本地 Cross-Encoder 模型（如 bge-reranker-v2-m3，延迟 ~10ms）

def rerank_with_llm(query: str, candidates: list[dict], top_k: int = 3) -> list[dict]:
    """用 LLM 对粗召回结果精排。"""
    prompt = f"""给定用户问题：「{query}」

以下是与该问题可能相关的文档片段，请按相关性从高到低排序，只返回排名序号（如 3,1,5,2,4）：

"""
    for i, c in enumerate(candidates):
        prompt += f"\n[{i+1}] {c['text'][:300]}...\n"

    # 调用 LLM 返回排序 → 取 Top-K
    ...
```

### P3-4：记忆重要性评分

**目标**：LLM 在存储时打分，检索时加权，关键信息（过敏史等）不被淹没。

```python
IMPORTANCE_PROMPT = """请评估以下对话片段的"长期记忆重要性"（只回复数字 1-5）：
5 — 过敏史、重大诊断、关键医嘱（关乎患者健康安全）
4 — 慢性病进展、用药调整、检查异常结果
3 — 一般性症状描述、常规问诊
2 — 挂号预约、缴费等行政类
1 — 寒暄、闲聊、非医疗内容

对话：「{content}」
"""

def score_importance(content: str, llm) -> int:
    """用 LLM 对一条记忆打分 1-5。"""
    ...
    return int(response)  # 1-5

# 检索时加权
weighted_score = similarity_score * (1.0 + 0.2 * importance)
```

### P3-5：反馈闭环

**目标**：用户 👍/👎 → 写回 Qdrant → 后续检索加权。

```python
# API 新增
@router.post("/memory/{point_id}/feedback")
def memory_feedback(point_id: str, helpful: bool) -> dict:
    """用户对某条记忆的反馈。"""
    client.set_payload(
        collection_name=MEMORY_COLLECTION,
        payload={"helpful": helpful, "feedback_at": datetime.now().isoformat()},
        points=[point_id],
    )
    return {"status": "recorded"}

# 检索时加权
if payload.get("helpful") is True:
    score *= 1.15  # 正反馈加权
elif payload.get("helpful") is False:
    score *= 0.85  # 负反馈降权
```

---

## 需要 Java 侧配合的清单

| # | 事项 | 优先级 | Phase |
|---|------|--------|-------|
| 1 | 建 `ai_knowledge_documents` 表 | 必须 | P2 |
| 2 | `ChatRequestDTO` 已有 `conversationId`（已完成） | ✅ | — |
| 3 | `ChatRequestDTO` 已有 `memoryEnabled`（已完成） | ✅ | — |
| 4 | `AiServiceClient` 新增 `deleteKnowledge(docId)` | 必须 | P2 |
| 5 | `AiServiceClient` 新增 `ingestKnowledge(...)` | 建议 | P2 |
| 6 | `ReportService.deleteReport()` 调用删除联动 | 必须 | P2 |
| 7 | 前端新建对话时生成 UUID（已完成） | ✅ | — |
| 8 | 前端记忆反馈按钮 👍/👎 | 建议 | P3 |

---

## 风险与注意事项

| 风险 | 缓解措施 |
|------|---------|
| Embedding API 延迟增加 | 批量 embedding + 并行检索 + 异步写入 |
| Qdrant 存储膨胀 | TTL 自动清理 + 去重 + 定期巡检 |
| LLM 重要性/画像抽取质量不稳定 | confidence 阈值 + 人工审核接口 |
| 混合检索 (BM25+Dense) 部署复杂 | 先在 Qdrant 原生支持，避免引入 ES |
| 父子切片误命中 | 子切片命中阈值设为 > 0.85 才触发 parent 还原 |
| Java ↔ Python 网络抖动 | 删除/入库接口异步重试 + 补偿机制 |
| 医学隐私合规 | 敏感科室 `memoryEnabled=false`，患者端可查看/删除自己的记忆 |
