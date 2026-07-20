"""测试：健康检查路由"""

from fastapi import APIRouter

from app.memory import check_memory_health

router = APIRouter(tags=["健康检查"])


@router.get("/health")
async def health() -> dict:
    memory = check_memory_health()
    return {
        "status": "ok",
        "memory": {
            "ok": memory["ok"],
            "qdrant_ok": memory["qdrant_ok"],
            "embedding_ok": memory["embedding_ok"],
        },
    }
