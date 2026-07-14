"""用户画像：跨会话的持久化患者信息。

与 wenrun_chat_memory（会话级）不同，用户画像按 user_id 维度存储，
支持跨会话检索，让 Agent 在新建对话中也能"记住"患者的基本情况。
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from wenrun_ai.memory.embeddings import embed_query, get_vector_size
from wenrun_ai.memory.store import _get_client
from wenrun_ai.settings import base

_profile_logger = logging.getLogger("wenrun_ai.memory.profile")

PROFILE_COLLECTION = "wenrun_user_profile"
_profile_ensured: bool = False

# ── 画像字段定义 ──

PROFILE_FIELDS = [
    ("allergies", "过敏史信息"),
    ("chronic_diseases", "慢性病史"),
    ("current_medications", "当前用药"),
    ("recent_symptoms", "近期症状"),
    ("family_history", "家族史"),
    ("lifestyle_notes", "生活习惯备注"),
    ("conversation_summary", "对话摘要"),
]


# ── Collection 管理 ──

def _ensure_profile_collection() -> None:
    """确保用户画像 Collection 存在（幂等）。"""
    global _profile_ensured
    if _profile_ensured:
        return
    client = _get_client()
    existing = {c.name for c in client.get_collections().collections}
    if PROFILE_COLLECTION not in existing:
        vector_size = get_vector_size()
        client.create_collection(
            collection_name=PROFILE_COLLECTION,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        _profile_logger.info("已创建用户画像 Collection: %s", PROFILE_COLLECTION)
    _profile_ensured = True


# ── 写入 ──

def upsert_profile(
    user_id: int,
    profile_type: str,
    content: str,
    *,
    source_conversation_id: str | None = None,
    confidence: float = 1.0,
) -> str | None:
    """写入或更新一条用户画像。

    使用 user_id + profile_type 作为业务主键，
    同一用户同一类型的画像会被覆盖（先删旧再插新）。

    Args:
        user_id: 用户 ID。
        profile_type: 画像类型（allergies / chronic_diseases / ...）。
        content: 画像内容文本。
        source_conversation_id: 来源会话 ID（可溯源）。
        confidence: LLM 提取置信度（0-1）。

    Returns:
        point id；失败返回 None。
    """
    if not content.strip():
        return None

    try:
        _ensure_profile_collection()
        client = _get_client()

        # 先删除该用户该类型的旧画像
        client.delete(
            collection_name=PROFILE_COLLECTION,
            points_selector=Filter(
                must=[
                    FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                    FieldCondition(key="profile_type", match=MatchValue(value=profile_type)),
                ]
            ),
        )

        # 写入新画像
        point_id = f"profile_{user_id}_{profile_type}"
        vector = embed_query(content)

        client.upsert(
            collection_name=PROFILE_COLLECTION,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "user_id": user_id,
                        "profile_type": profile_type,
                        "content": content,
                        "source_conversation_id": source_conversation_id,
                        "confidence": confidence,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
            ],
        )

        _profile_logger.debug(
            "用户画像已更新 | user=%d | type=%s | confidence=%.2f",
            user_id,
            profile_type,
            confidence,
        )
        return point_id

    except Exception:
        _profile_logger.exception("写入用户画像失败")
        return None


# ── 检索 ──

def get_user_profile(user_id: int) -> list[dict]:
    """获取指定用户的全部画像条目（按更新时间降序）。

    Returns:
        [{"profile_type": "allergies", "content": "青霉素过敏", ...}, ...]
    """
    try:
        _ensure_profile_collection()
        client = _get_client()

        # 使用 scroll 获取该用户全部画像（通常不超过 20 条）
        records, _ = client.scroll(
            collection_name=PROFILE_COLLECTION,
            scroll_filter=Filter(
                must=[
                    FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                ]
            ),
            limit=50,
        )

        results: list[dict] = []
        for point in records:
            if point.payload:
                results.append({
                    "profile_type": str(point.payload.get("profile_type", "")),
                    "content": str(point.payload.get("content", "")),
                    "confidence": float(point.payload.get("confidence", 0)),
                    "updated_at": str(point.payload.get("updated_at", "")),
                })

        _profile_logger.debug("用户画像检索 | user=%d | entries=%d", user_id, len(results))
        return results

    except Exception:
        _profile_logger.exception("用户画像检索失败")
        return []


def search_profile(
    user_id: int,
    query: str,
    top_k: int = 3,
) -> list[dict]:
    """语义检索用户画像：找到与当前问题最相关的画像条目。

    Args:
        user_id: 用户 ID。
        query: 当前用户提问文本。
        top_k: 返回 Top-K 条。

    Returns:
        [{"profile_type": "...", "content": "...", "score": 0.9}, ...]
    """
    if not query.strip():
        return []

    try:
        _ensure_profile_collection()
        client = _get_client()

        vector = embed_query(query)

        results = client.query_points(
            collection_name=PROFILE_COLLECTION,
            query=vector,
            query_filter=Filter(
                must=[
                    FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                ]
            ),
            limit=top_k,
        )

        entries: list[dict] = []
        for hit in results.points:
            if hit.payload:
                entries.append({
                    "profile_type": str(hit.payload.get("profile_type", "")),
                    "content": str(hit.payload.get("content", "")),
                    "score": float(hit.score),
                })

        return entries

    except Exception:
        _profile_logger.exception("用户画像语义检索失败")
        return []


def format_profile_for_prompt(profile_entries: list[dict]) -> str | None:
    """将画像条目格式化为 Prompt 块。

    返回格式：
        <user_profile>
        - 过敏史：青霉素过敏
        - 慢性病史：高血压
        ...
        </user_profile>
    """
    if not profile_entries:
        return None

    type_labels = dict(PROFILE_FIELDS)

    lines = [
        "<user_profile>",
        "以下是该用户的已知画像信息，供参考：",
        "",
    ]

    for entry in profile_entries:
        ptype = entry.get("profile_type", "")
        label = type_labels.get(ptype, ptype)
        content = entry.get("content", "")
        lines.append(f"- {label}：{content}")

    lines.append("")
    lines.append(
        "以上画像信息可能不完整或有更新，如与患者当前描述不一致，以患者最新描述为准。"
    )
    lines.append("</user_profile>")

    return "\n".join(lines)


# ── LLM 画像抽取骨架（Phase 3 填充） ──

PROFILE_EXTRACTION_PROMPT = """你是一个医疗信息提取助手。请从以下对话片段中提取患者的关键信息。

只提取以下字段中**明确出现**的信息，未提及的字段不要编造：
- allergies: 过敏史（药物/食物过敏）
- chronic_diseases: 慢性病史（高血压、糖尿病等）
- current_medications: 当前用药（药名、剂量、频率）
- recent_symptoms: 近期症状描述
- family_history: 家族史
- lifestyle_notes: 生活习惯（吸烟、饮酒、运动等）

对于每个提取到的字段，给出置信度（0-1）和依据（引述原文片段）。

对话：
{conversation_text}

请以 JSON 格式返回，只包含有提取到信息的字段：
```json
{{
  "allergies": {{"value": "青霉素过敏", "confidence": 0.95, "evidence": "患者说对青霉素过敏"}}
}}
```
"""
