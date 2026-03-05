from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.infrastructure.db.models.channel import Channel

router = APIRouter(prefix="/channels", tags=["channels"])


class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ChannelOut(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[ChannelOut])
async def list_channels(db: AsyncSession = Depends(get_db)) -> List[ChannelOut]:
    res = await db.execute(select(Channel).order_by(Channel.name.asc()))
    return list(res.scalars().all())


@router.post("", response_model=ChannelOut, status_code=status.HTTP_201_CREATED)
async def create_channel(payload: ChannelCreate, db: AsyncSession = Depends(get_db)) -> ChannelOut:
    ch = Channel(name=payload.name.strip())

    db.add(ch)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Channel already exists")

    await db.refresh(ch)
    return ch