import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import api_router
from app.core.logging import setup_logging
from app.memory import check_memory_health

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    setup_logging()
    health = check_memory_health()
    if health["ok"]:
        logger.info("记忆服务就绪 | collection=%s", health["collection"])
    else:
        logger.warning("记忆服务不可用，将以无记忆模式运行")
    yield


app = FastAPI(title="Wenrun AI", version="1.0.0", lifespan=lifespan)
app.include_router(api_router)
