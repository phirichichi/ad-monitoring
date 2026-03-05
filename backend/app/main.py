from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import router as v1_router
from app.infrastructure.db.session import db_manager

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

# In docker+nginx-proxy mode, CORS is usually irrelevant (same-origin).
# But keeping it helps when you hit backend directly (http://<ip>:8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^http://(\d{1,3}\.){3}\d{1,3}(:\d+)?$" if settings.ENVIRONMENT == "development" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup() -> None:
    await db_manager.initialize()

@app.on_event("shutdown")
async def on_shutdown() -> None:
    await db_manager.close()

app.include_router(v1_router, prefix=settings.API_V1_PREFIX)

@app.get("/health/ready")
def ready():
    return {"status": "ok"}