import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from wenrun_ai.logging import setup_logging
from wenrun_ai.memory import check_memory_health, cleanup_expired_memories
from wenrun_ai.memory.profile import _ensure_profile_collection

from .routers import chat as chat_router
from .routers import knowledge as knowledge_router

_app_logger = logging.getLogger("wenrun_ai.app")

# TTL 清理间隔（秒）
_TTL_CLEANUP_INTERVAL = 3600  # 1 小时


async def _ttl_cleanup_loop() -> None:
    """后台循环：定期清理过期会话记忆。"""
    while True:
        try:
            await asyncio.sleep(_TTL_CLEANUP_INTERVAL)
            deleted = await asyncio.to_thread(cleanup_expired_memories)
            if deleted > 0:
                _app_logger.info("TTL 后台清理完成 | deleted=%d", deleted)
        except asyncio.CancelledError:
            _app_logger.info("TTL 清理任务已取消")
            break
        except Exception:
            _app_logger.exception("TTL 后台清理异常")


@asynccontextmanager
async def lifespan(application: FastAPI):
    """应用生命周期管理。

    startup:
    - 检查记忆功能健康状态（Qdrant + Embedding）
    - 确保用户画像 Collection 存在
    - 启动 TTL 过期清理后台任务

    shutdown:
    - 取消 TTL 清理任务
    """
    # ── startup ──
    _app_logger.info("正在检查记忆功能依赖…")
    health_result = check_memory_health()
    _app_logger.info("记忆功能健康检查结果: %s", health_result)

    _app_logger.info("正在确保用户画像 Collection…")
    try:
        _ensure_profile_collection()
        _app_logger.info("用户画像 Collection 就绪")
    except Exception:
        _app_logger.warning("用户画像 Collection 未就绪（Qdrant 不可用），画像功能降级")

    ttl_task = asyncio.create_task(_ttl_cleanup_loop())
    _app_logger.info("TTL 过期清理任务已启动（间隔 %d 秒）", _TTL_CLEANUP_INTERVAL)

    yield

    # ── shutdown ──
    ttl_task.cancel()
    try:
        await ttl_task
    except asyncio.CancelledError:
        pass
    _app_logger.info("应用已关闭")


def create_app() -> FastAPI:
    setup_logging()
    application = FastAPI(
        title="wenrun-ai",
        version="0.2.0",
        lifespan=lifespan,
    )
    application.include_router(chat_router.router, prefix="/v1", tags=["chat"])
    application.include_router(knowledge_router.router, prefix="/v1", tags=["knowledge"])

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
