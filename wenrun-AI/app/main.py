from fastapi import FastAPI
from app.routers.java_intergration import router as java_router

app = FastAPI(title="Wenrun AI", version="1.0.0")
app.include_router(java_router)
