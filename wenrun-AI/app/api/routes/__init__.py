from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.java_chat import router as java_chat_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(java_chat_router)

__all__ = ["api_router"]
