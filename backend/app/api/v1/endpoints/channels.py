from __future__ import annotations

from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import AuthenticatedUser, require_admin
from app.api.dependencies.database import get_db
from app.infrastructure.db.models.channel import Channel

router = APIRouter(prefix="/channels", tags=["channels"])

ALLOWED_SOURCE_TYPES = {"rtmp", "hls", "file", "unknown"}


def normalize_slug(value: str) -> str:
    """
    Normalize channel slugs to match the frontend behavior.
    """
    return value.strip().lower().replace(" ", "-")


class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    stream_url: str = Field(..., min_length=1, max_length=1024)
    timezone: str = Field(default="Africa/Lusaka", min_length=1, max_length=100)
    is_active: bool = True
    monitoring_enabled: bool = True
    source_type: str = Field(default="unknown", min_length=1, max_length=50)

    @field_validator("name", "slug", "stream_url", "timezone", "source_type")
    @classmethod
    def strip_required_strings(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        cleaned = normalize_slug(value)
        if not cleaned:
            raise ValueError("Slug cannot be empty")
        return cleaned

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in ALLOWED_SOURCE_TYPES:
            raise ValueError(
                f"source_type must be one of: {', '.join(sorted(ALLOWED_SOURCE_TYPES))}"
            )
        return cleaned


class ChannelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    stream_url: str | None = Field(default=None, min_length=1, max_length=1024)
    timezone: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None
    monitoring_enabled: bool | None = None
    source_type: str | None = Field(default=None, min_length=1, max_length=50)
    status: str | None = Field(default=None, min_length=1, max_length=50)
    last_seen_at: datetime | None = None

    @field_validator("name", "slug", "stream_url", "timezone", "source_type", "status")
    @classmethod
    def strip_optional_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = normalize_slug(value)
        if not cleaned:
            raise ValueError("Slug cannot be empty")
        return cleaned

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip().lower()
        if cleaned not in ALLOWED_SOURCE_TYPES:
            raise ValueError(
                f"source_type must be one of: {', '.join(sorted(ALLOWED_SOURCE_TYPES))}"
            )
        return cleaned


class ChannelOut(BaseModel):
    id: UUID
    name: str
    slug: str
    stream_url: str
    timezone: str
    is_active: bool
    monitoring_enabled: bool
    source_type: str
    status: str
    last_seen_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[ChannelOut])
async def list_channels(
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> List[ChannelOut]:
    """
    Return all channels for the admin Channels page.
    """
    result = await db.execute(select(Channel).order_by(Channel.name.asc()))
    return list(result.scalars().all())


@router.post("", response_model=ChannelOut, status_code=status.HTTP_201_CREATED)
async def create_channel(
    payload: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> ChannelOut:
    channel = Channel(
        name=payload.name,
        slug=payload.slug,
        stream_url=payload.stream_url,
        timezone=payload.timezone,
        is_active=payload.is_active,
        monitoring_enabled=payload.monitoring_enabled,
        source_type=payload.source_type,
        status="linked" if payload.monitoring_enabled and payload.is_active else "configured",
    )

    db.add(channel)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Channel with the same name or slug already exists",
        )

    await db.refresh(channel)
    return channel


@router.put("/{channel_id}", response_model=ChannelOut)
async def update_channel(
    channel_id: UUID,
    payload: ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> ChannelOut:
    channel = await db.get(Channel, channel_id)
    if channel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(channel, field, value)

    if channel.is_active is False:
        channel.status = "inactive"
    elif channel.is_active is True and channel.monitoring_enabled is False:
        channel.status = "configured"
    elif channel.is_active is True and channel.monitoring_enabled is True:
        channel.status = "linked"
    elif not channel.status:
        channel.status = "unknown"

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Channel update conflicts with an existing name or slug",
        )

    await db.refresh(channel)
    return channel


@router.delete(
    "/{channel_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_channel(
    channel_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> Response:
    channel = await db.get(Channel, channel_id)
    if channel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    await db.delete(channel)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)