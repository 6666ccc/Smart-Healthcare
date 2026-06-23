from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers.java_intergration import router as java_router
from app.services.auth import token_manager


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """应用生命周期：启动时预取 OAuth2 令牌。"""
    await token_manager.startup_refresh()
    yield


app = FastAPI(title="Wenrun AI", version="1.0.0", lifespan=lifespan)
app.include_router(java_router)
