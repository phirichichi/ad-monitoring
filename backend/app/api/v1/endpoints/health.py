from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/ready")
async def ready():
    return {"status": "ok"}

@router.get("/live")
async def live():
    return {"status": "ok"}