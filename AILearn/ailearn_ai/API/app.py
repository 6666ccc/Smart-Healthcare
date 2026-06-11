import logging

from fastapi import FastAPI

from ailearn_ai.logging import setup_logging
from ailearn_ai.memory import check_memory_health

from .routers import chat as chat_router

_app_logger = logging.getLogger("ailearn_ai.app")


def create_app() -> FastAPI:
    setup_logging()
    application = FastAPI(title="ailearn-ai", version="0.1.0")
    application.include_router(chat_router.router, prefix="/v1", tags=["chat"])

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # 启动时检查记忆功能依赖（Qdrant + Embedding API）
    _app_logger.info("正在检查记忆功能依赖…")
    health_result = check_memory_health()
    _app_logger.info("记忆功能健康检查结果: %s", health_result)

    return application


app = create_app()
