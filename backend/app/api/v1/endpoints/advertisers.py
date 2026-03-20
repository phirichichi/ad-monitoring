from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import AuthenticatedUser, require_admin
from app.api.dependencies.database import get_db
from app.infrastructure.db.models.advertiser import Advertiser

router = APIRouter(prefix="/advertisers", tags=["advertisers"])

UPLOAD_DIR = Path("/app/uploads/advertisers")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class AdvertiserCreate(BaseModel):
    """
    Consolidated ad asset creation payload.
    """

    name: str = Field(..., min_length=1, max_length=255)
    video_name: str = Field(..., min_length=1, max_length=255)
    contract_start_date: date | None = None
    contract_end_date: date | None = None

    @field_validator("name", "video_name")
    @classmethod
    def validate_non_empty_string(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @model_validator(mode="after")
    def validate_contract_dates(self) -> "AdvertiserCreate":
        if (
            self.contract_start_date is not None
            and self.contract_end_date is not None
            and self.contract_start_date > self.contract_end_date
        ):
            raise ValueError(
                "contract_end_date must be greater than or equal to contract_start_date"
            )
        return self


class AdvertiserOut(BaseModel):
    id: UUID
    name: str
    video_name: str
    video_file_name: str | None = None
    contract_start_date: date | None = None
    contract_end_date: date | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[AdvertiserOut])
async def list_advertisers(
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> List[AdvertiserOut]:
    """
    List all consolidated ad assets.
    """
    result = await db.execute(
        select(Advertiser).order_by(
            Advertiser.name.asc(),
            Advertiser.video_name.asc(),
        )
    )
    return list(result.scalars().all())


@router.post("", response_model=AdvertiserOut, status_code=status.HTTP_201_CREATED)
async def create_advertiser(
    payload: AdvertiserCreate,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> AdvertiserOut:
    """
    Create a consolidated advertiser-owned ad asset.
    """
    advertiser = Advertiser(
        name=payload.name,
        video_name=payload.video_name,
        contract_start_date=payload.contract_start_date,
        contract_end_date=payload.contract_end_date,
    )

    db.add(advertiser)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Advertiser asset already exists",
        )

    await db.refresh(advertiser)
    return advertiser


@router.post("/{advertiser_id}/video", response_model=AdvertiserOut)
async def upload_advertiser_video(
    advertiser_id: UUID,
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> AdvertiserOut:
    """
    Attach an uploaded video file to an existing ad asset record.
    """
    advertiser = await db.get(Advertiser, advertiser_id)
    if advertiser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertiser asset not found",
        )

    if not video.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video filename is required",
        )

    safe_name = f"{advertiser_id}_{Path(video.filename).name}"
    save_path = UPLOAD_DIR / safe_name

    file_bytes = await video.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded video is empty",
        )

    save_path.write_bytes(file_bytes)

    advertiser.video_file_name = str(save_path)

    await db.commit()
    await db.refresh(advertiser)

    return advertiser


@router.delete(
    "/{advertiser_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_advertiser(
    advertiser_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> Response:
    """
    Delete a consolidated ad asset record.
    """
    advertiser = await db.get(Advertiser, advertiser_id)
    if advertiser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertiser asset not found",
        )

    if advertiser.video_file_name:
        try:
            file_path = Path(advertiser.video_file_name)
            if file_path.exists() and file_path.is_file():
                file_path.unlink()
        except OSError:
            pass

    await db.delete(advertiser)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)