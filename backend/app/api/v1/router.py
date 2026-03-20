from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    advertisers,
    auth,
    channels,
    health,
    playlists,
    reports,
    users,
)

router = APIRouter()

router.include_router(health.router)
router.include_router(auth.router)

router.include_router(channels.router)
router.include_router(advertisers.router)
router.include_router(users.router)
router.include_router(playlists.router)
router.include_router(reports.router)
