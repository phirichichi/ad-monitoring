from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.infrastructure.db.session import db_manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db_manager.initialize()
    try:
        yield
    finally:
        await db_manager.close()


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# In docker+nginx-proxy mode, CORS is usually irrelevant (same-origin).
# But keeping it helps when you hit backend directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=(
        r"^http://(\d{1,3}\.){3}\d{1,3}(:\d+)?$"
        if settings.ENVIRONMENT == "development"
        else None
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/health/ready")
def ready() -> dict[str, str]:
    return {"status": "ok"}