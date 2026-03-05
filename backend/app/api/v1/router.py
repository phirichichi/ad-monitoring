from fastapi import APIRouter

from app.api.v1.endpoints import auth, health, channels, advertisers, advertisements, users, playlists

router = APIRouter()

router.include_router(health.router)
router.include_router(auth.router)

router.include_router(channels.router)
router.include_router(advertisers.router)
router.include_router(advertisements.router)
router.include_router(users.router)
router.include_router(playlists.router)