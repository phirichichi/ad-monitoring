from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.infrastructure.db.models.advertisement import Advertisement
from app.infrastructure.db.models.advertiser import Advertiser

router = APIRouter(prefix="/advertisements", tags=["advertisements"])


class AdvertisementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    advertiser_id: UUID


class AdvertisementOut(BaseModel):
    id: UUID
    title: str
    advertiser_id: UUID

    class Config:
        from_attributes = True


@router.get("", response_model=List[AdvertisementOut])
async def list_ads(db: AsyncSession = Depends(get_db)) -> List[AdvertisementOut]:
    res = await db.execute(select(Advertisement).order_by(Advertisement.title.asc()))
    return list(res.scalars().all())


@router.post("", response_model=AdvertisementOut, status_code=status.HTTP_201_CREATED)
async def create_ad(payload: AdvertisementCreate, db: AsyncSession = Depends(get_db)) -> AdvertisementOut:
    adv = await db.get(Advertiser, payload.advertiser_id)
    if not adv:
        raise HTTPException(status_code=404, detail="Advertiser not found")

    ad = Advertisement(
        title=payload.title.strip(),
        advertiser_id=payload.advertiser_id,
    )

    db.add(ad)
    await db.commit()
    await db.refresh(ad)
    return ad