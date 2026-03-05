# backend/app/api/v1/endpoints/playlists.py

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.infrastructure.db.models.playlist import Playlist

router = APIRouter(prefix="/playlists", tags=["playlists"])


class PlaylistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class PlaylistOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[PlaylistOut])
async def list_playlists(db: AsyncSession = Depends(get_db)) -> List[PlaylistOut]:
    res = await db.execute(select(Playlist).order_by(Playlist.name.asc()))
    return list(res.scalars().all())


@router.post("", response_model=PlaylistOut, status_code=status.HTTP_201_CREATED)
async def create_playlist(payload: PlaylistCreate, db: AsyncSession = Depends(get_db)) -> PlaylistOut:
    pl = Playlist(name=payload.name.strip(), description=(payload.description or None))

    db.add(pl)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Playlist already exists")

    await db.refresh(pl)
    return pl


@router.patch("/{playlist_id}", response_model=PlaylistOut)
async def update_playlist(
    playlist_id: UUID,
    payload: PlaylistUpdate,
    db: AsyncSession = Depends(get_db),
) -> PlaylistOut:
    res = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    pl = res.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    if payload.name is not None:
        pl.name = payload.name.strip()
    if payload.description is not None:
        pl.description = payload.description

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Playlist name already exists")

    await db.refresh(pl)
    return pl


@router.delete(
    "/{playlist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_playlist(playlist_id: UUID, db: AsyncSession = Depends(get_db)) -> Response:
    res = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    pl = res.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    await db.delete(pl)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)