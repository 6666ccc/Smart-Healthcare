from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.logging import setup_logging
from app.routers.java_intergration import router as java_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """应用生命周期：启动时初始化日志，关闭时无需额外清理。"""
    setup_logging()
    yield


app = FastAPI(title="Wenrun AI", version="1.0.0", lifespan=lifespan)
app.include_router(java_router)


@app.get("/health")
async def health() -> dict[str, str]:
    """供 Java AiServiceClient.isHealthy() 探测。"""
    return {"status": "ok"}
