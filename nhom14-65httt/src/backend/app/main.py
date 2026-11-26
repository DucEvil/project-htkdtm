"""Entry point – FastAPI application cho Vị Việt."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    yield


app = FastAPI(
    title="Vị Việt API",
    description="API đặt món Việt tích hợp gợi ý cá nhân hóa",
    version="0.1.0",
    lifespan=lifespan,
)

setup_middleware(app)
app.include_router(auth_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health_check():
    """Kiểm tra backend đang chạy."""
    return {"status": "ok"}
