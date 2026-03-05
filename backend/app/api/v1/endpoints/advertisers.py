from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.infrastructure.db.models.advertiser import Advertiser

router = APIRouter(prefix="/advertisers", tags=["advertisers"])


class AdvertiserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class AdvertiserOut(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[AdvertiserOut])
async def list_advertisers(db: AsyncSession = Depends(get_db)) -> List[AdvertiserOut]:
    res = await db.execute(select(Advertiser).order_by(Advertiser.name.asc()))
    return list(res.scalars().all())


@router.post("", response_model=AdvertiserOut, status_code=status.HTTP_201_CREATED)
async def create_advertiser(payload: AdvertiserCreate, db: AsyncSession = Depends(get_db)) -> AdvertiserOut:
    adv = Advertiser(name=payload.name.strip())

    db.add(adv)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Advertiser already exists")

    await db.refresh(adv)
    return adv