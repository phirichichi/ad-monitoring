from __future__ import annotations

from pathlib import Path
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import AuthenticatedUser, require_admin
from app.api.dependencies.database import get_db
from app.infrastructure.db.models.playlist import Playlist

router = APIRouter(prefix="/playlists", tags=["playlists"])

UPLOAD_DIR = Path("/app/uploads/playlists")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ScheduleRowIn(BaseModel):
    id: str
    adName: str
    videoUrl: Optional[str] = None
    playTime: str
    duration: str
    date: str


class PlaylistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class PlaylistScheduleUpdate(BaseModel):
    schedule_rows: List[ScheduleRowIn] = Field(default_factory=list)


class PlaylistOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    video_filename: Optional[str] = None
    video_url: Optional[str] = None
    schedule_rows: List[dict[str, Any]] = Field(default_factory=list)

    class Config:
        from_attributes = True


def to_playlist_out(playlist: Playlist, date: Optional[str] = None) -> PlaylistOut:
    rows = playlist.schedule_rows or []

    if date:
        rows = [row for row in rows if row.get("date") == date]

    video_url = None
    if playlist.video_path:
        video_url = f"/api/v1/playlists/{playlist.id}/video"

    return PlaylistOut(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        video_filename=playlist.video_filename,
        video_url=video_url,
        schedule_rows=rows,
    )


@router.get("", response_model=List[PlaylistOut])
async def list_playlists(
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> List[PlaylistOut]:
    result = await db.execute(select(Playlist).order_by(Playlist.name.asc()))
    playlists = list(result.scalars().all())
    return [to_playlist_out(playlist) for playlist in playlists]


@router.get("/{playlist_id}", response_model=PlaylistOut)
async def get_playlist(
    playlist_id: UUID,
    date: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> PlaylistOut:
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    return to_playlist_out(playlist, date=date)


@router.post("", response_model=PlaylistOut, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    payload: PlaylistCreate,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> PlaylistOut:
    playlist = Playlist(
        name=payload.name.strip(),
        description=payload.description or None,
        schedule_rows=[],
    )

    db.add(playlist)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Playlist already exists")

    await db.refresh(playlist)
    return to_playlist_out(playlist)


@router.patch("/{playlist_id}", response_model=PlaylistOut)
async def update_playlist(
    playlist_id: UUID,
    payload: PlaylistUpdate,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> PlaylistOut:
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    if payload.name is not None:
        playlist.name = payload.name.strip()

    if payload.description is not None:
        playlist.description = payload.description

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Playlist name already exists",
        )

    await db.refresh(playlist)
    return to_playlist_out(playlist)


@router.patch("/{playlist_id}/schedule", response_model=PlaylistOut)
async def update_playlist_schedule(
    playlist_id: UUID,
    payload: PlaylistScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> PlaylistOut:
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    playlist.schedule_rows = [row.model_dump() for row in payload.schedule_rows]

    await db.commit()
    await db.refresh(playlist)

    return to_playlist_out(playlist)


@router.post("/{playlist_id}/video", response_model=PlaylistOut)
async def upload_playlist_video(
    playlist_id: UUID,
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> PlaylistOut:
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    if not video.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Video filename is required")

    suffix = Path(video.filename).suffix or ".mp4"
    safe_filename = f"{playlist_id}{suffix}"
    destination = UPLOAD_DIR / safe_filename

    contents = await video.read()
    destination.write_bytes(contents)

    playlist.video_filename = video.filename
    playlist.video_path = str(destination)

    await db.commit()
    await db.refresh(playlist)

    return to_playlist_out(playlist)


@router.get("/{playlist_id}/video")
async def stream_playlist_video(
    playlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    if not playlist.video_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist video not found")

    file_path = Path(playlist.video_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored video file is missing")

    return FileResponse(
        path=file_path,
        filename=playlist.video_filename or file_path.name,
        media_type="video/mp4",
    )


@router.delete(
    "/{playlist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_playlist(
    playlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> Response:
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    if playlist.video_path:
        video_path = Path(playlist.video_path)
        if video_path.exists():
            try:
                video_path.unlink()
            except OSError:
                pass

    await db.delete(playlist)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)