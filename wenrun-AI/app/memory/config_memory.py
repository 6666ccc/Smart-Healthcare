"""
Qdrant 向量数据库连接配置 — 为记忆功能提供底层向量存储与语义检索能力。

核心组件：
- OpenAIEmbeddings: 将文本编码为向量（text-embedding-3-small，1536 维）
- QdrantVectorStore: 向量索引 + 元数据过滤 + 语义相似度搜索

环境变量（配置于项目根目录 .env）：
- EMBEDDING_MODEL:  嵌入模型名称，默认 text-embedding-3-small
- QDRANT_URL:       Qdrant 服务地址，默认从 VECTOR_DATABASE_URL + PORT 拼接
- QDRANT_COLLECTION: Qdrant 集合名称，默认 wenrun_ai_memory
"""

import logging
import os

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 嵌入模型 — 负责将文本内容转换为高维向量，用于后续语义相似度计算
#   text-embedding-3-small 输出 1536 维向量，性价比高，适合中文语义检索
# ---------------------------------------------------------------------------
embeddings = OpenAIEmbeddings(
    model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
)

# ---------------------------------------------------------------------------
# Qdrant 连接参数（优先从环境变量读取，回退到硬编码默认值）
# ---------------------------------------------------------------------------
QDRANT_URL = os.getenv(
    "QDRANT_URL",
    f"http://{os.getenv('VECTOR_DATABASE_URL', '47.100.11.196')}:"
    f"{os.getenv('VECTOR_DATABASE_PORT', '6333')}",
)
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "wenrun_ai_memory")

# ---------------------------------------------------------------------------
# 确保 Qdrant 集合存在 — 若不存在则自动创建
#   向量维度 1536（匹配 text-embedding-3-small），余弦距离适合语义相似度计算
# ---------------------------------------------------------------------------
_qdrant_client = QdrantClient(url=QDRANT_URL)

try:
    existing = _qdrant_client.get_collections()
    collection_names = {c.name for c in existing.collections}

    if QDRANT_COLLECTION not in collection_names:
        _qdrant_client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=1536,
                distance=Distance.COSINE,
            ),
        )
        logger.info(
            "Qdrant 集合已创建 | url=%s collection=%s dimension=1536 distance=cosine",
            QDRANT_URL,
            QDRANT_COLLECTION,
        )
    else:
        logger.info(
            "Qdrant 集合已存在 | url=%s collection=%s",
            QDRANT_URL,
            QDRANT_COLLECTION,
        )
except Exception as exc:
    logger.warning(
        "Qdrant 集合初始化异常（服务可能未启动）| url=%s collection=%s error=%s",
        QDRANT_URL,
        QDRANT_COLLECTION,
        exc,
    )

# ---------------------------------------------------------------------------
# LangChain 封装 — 对外暴露统一的向量存储接口
#   内部使用 QdrantClient 进行原始操作（scroll、delete 等），
#   QdrantVectorStore 用于 add_texts / similarity_search 语义检索
# ---------------------------------------------------------------------------
vector_store = QdrantVectorStore(
    client=_qdrant_client,
    collection_name=QDRANT_COLLECTION,
    embedding=embeddings,
)
