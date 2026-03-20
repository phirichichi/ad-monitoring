from __future__ import annotations

import csv
import io
from datetime import UTC, datetime, timedelta
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import AuthenticatedUser, require_admin
from app.api.dependencies.database import get_db
from app.infrastructure.db.models.advertiser import Advertiser
from app.infrastructure.db.models.channel import Channel
from app.infrastructure.db.models.detection import Detection

router = APIRouter(prefix="/reports", tags=["reports"])

ALLOWED_PLAYBACK_STATUSES = {
    "matched",
    "partial",
    "missed",
    "unscheduled",
    "verified",
    "rejected",
}
ALLOWED_EXPORT_FORMATS = {"csv"}


def ensure_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class PlaybackLogOut(BaseModel):
    id: UUID
    channel_id: UUID
    channel_name: str
    advertiser_id: UUID | None = None
    advertiser_name: str
    video_name: str
    played_at: datetime
    played_date: str | None = None
    played_time: str | None = None
    duration_seconds: int | None = None
    confidence: float | None = None
    status: str
    screenshot_path: str | None = None
    screenshot_url: str | None = None
    evidence_available: bool = False
    created_at: datetime | None = None


class PlaybackReportGenerateRequest(BaseModel):
    format: str = Field(..., min_length=1, max_length=20)
    from_ts: datetime
    to_ts: datetime
    advertiser_name: str | None = None
    channel_id: UUID | None = None
    status: str | None = None
    min_duration_seconds: int | None = Field(default=None, ge=0)
    max_duration_seconds: int | None = Field(default=None, ge=0)

    @field_validator("format")
    @classmethod
    def validate_format(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in ALLOWED_EXPORT_FORMATS:
            raise ValueError("Only CSV export is enabled in the simple testing phase.")
        return cleaned

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None

        cleaned = value.strip().lower()
        if cleaned not in ALLOWED_PLAYBACK_STATUSES:
            raise ValueError(
                f"status must be one of: {', '.join(sorted(ALLOWED_PLAYBACK_STATUSES))}"
            )
        return cleaned

    @model_validator(mode="after")
    def validate_range(self) -> "PlaybackReportGenerateRequest":
        from_ts = ensure_timezone(self.from_ts)
        to_ts = ensure_timezone(self.to_ts)

        if from_ts >= to_ts:
            raise ValueError("from_ts must be earlier than to_ts")

        if (
            self.min_duration_seconds is not None
            and self.max_duration_seconds is not None
            and self.min_duration_seconds > self.max_duration_seconds
        ):
            raise ValueError("min_duration_seconds cannot be greater than max_duration_seconds")

        self.from_ts = from_ts
        self.to_ts = to_ts
        return self


class MockDetectionCreate(BaseModel):
    channel_id: UUID
    advertiser_id: UUID | None = None
    advertiser_name: str = Field(..., min_length=1, max_length=255)
    video_name: str = Field(..., min_length=1, max_length=255)
    played_at: datetime | None = None
    duration_seconds: int | None = Field(default=30, ge=0)
    confidence: float | None = Field(default=96.5, ge=0, le=100)
    status: str = Field(default="matched", min_length=1, max_length=50)
    screenshot_url: str | None = None
    screenshot_path: str | None = None

    @field_validator("advertiser_name", "video_name")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in ALLOWED_PLAYBACK_STATUSES:
            raise ValueError(
                f"status must be one of: {', '.join(sorted(ALLOWED_PLAYBACK_STATUSES))}"
            )
        return cleaned


def serialize_playback_log(row: Detection) -> PlaybackLogOut:
    return PlaybackLogOut(
        id=row.id,
        channel_id=row.channel_id,
        channel_name=row.channel_name,
        advertiser_id=row.advertiser_id,
        advertiser_name=row.advertiser_name,
        video_name=row.video_name,
        played_at=row.played_at,
        played_date=row.played_date.isoformat() if row.played_date else None,
        played_time=row.played_time.isoformat() if row.played_time else None,
        duration_seconds=row.duration_seconds,
        confidence=row.confidence,
        status=row.status,
        screenshot_path=row.screenshot_path,
        screenshot_url=row.screenshot_url,
        evidence_available=bool(row.screenshot_url or row.screenshot_path),
        created_at=row.created_at,
    )


def apply_detection_filters(
    stmt,
    *,
    from_ts: datetime,
    to_ts: datetime,
    advertiser_name: str | None = None,
    channel_id: UUID | None = None,
    status: str | None = None,
    min_duration_seconds: int | None = None,
    max_duration_seconds: int | None = None,
):
    filters = [
        Detection.played_at >= ensure_timezone(from_ts),
        Detection.played_at <= ensure_timezone(to_ts),
    ]

    if advertiser_name:
        filters.append(Detection.advertiser_name.ilike(f"%{advertiser_name.strip()}%"))

    if channel_id:
        filters.append(Detection.channel_id == channel_id)

    if status:
        filters.append(Detection.status == status.strip().lower())

    if min_duration_seconds is not None:
        filters.append(Detection.duration_seconds >= min_duration_seconds)

    if max_duration_seconds is not None:
        filters.append(Detection.duration_seconds <= max_duration_seconds)

    return stmt.where(and_(*filters))


@router.get("/playback-logs", response_model=List[PlaybackLogOut])
async def list_playback_logs(
    from_ts: datetime = Query(...),
    to_ts: datetime = Query(...),
    advertiser_name: str | None = Query(default=None),
    channel_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    min_duration_seconds: int | None = Query(default=None, ge=0),
    max_duration_seconds: int | None = Query(default=None, ge=0),
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> List[PlaybackLogOut]:
    from_ts = ensure_timezone(from_ts)
    to_ts = ensure_timezone(to_ts)

    if from_ts >= to_ts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_ts must be earlier than to_ts",
        )

    if (
        min_duration_seconds is not None
        and max_duration_seconds is not None
        and min_duration_seconds > max_duration_seconds
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_duration_seconds cannot be greater than max_duration_seconds",
        )

    cleaned_status = None
    if status and status.strip():
        cleaned_status = status.strip().lower()
        if cleaned_status not in ALLOWED_PLAYBACK_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"status must be one of: {', '.join(sorted(ALLOWED_PLAYBACK_STATUSES))}",
            )

    stmt = select(Detection).order_by(Detection.played_at.desc())
    stmt = apply_detection_filters(
        stmt,
        from_ts=from_ts,
        to_ts=to_ts,
        advertiser_name=advertiser_name,
        channel_id=channel_id,
        status=cleaned_status,
        min_duration_seconds=min_duration_seconds,
        max_duration_seconds=max_duration_seconds,
    )

    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    return [serialize_playback_log(row) for row in rows]


@router.post("/generate")
async def generate_playback_report(
    payload: PlaybackReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> Response:
    stmt = select(Detection).order_by(Detection.played_at.desc())
    stmt = apply_detection_filters(
        stmt,
        from_ts=payload.from_ts,
        to_ts=payload.to_ts,
        advertiser_name=payload.advertiser_name,
        channel_id=payload.channel_id,
        status=payload.status,
        min_duration_seconds=payload.min_duration_seconds,
        max_duration_seconds=payload.max_duration_seconds,
    )

    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(
        [
            "id",
            "channel_id",
            "channel_name",
            "advertiser_id",
            "advertiser_name",
            "video_name",
            "played_at",
            "played_date",
            "played_time",
            "duration_seconds",
            "confidence",
            "status",
            "screenshot_url",
            "screenshot_path",
            "evidence_available",
            "created_at",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                str(row.id),
                str(row.channel_id),
                row.channel_name,
                str(row.advertiser_id) if row.advertiser_id else "",
                row.advertiser_name,
                row.video_name,
                row.played_at.isoformat() if row.played_at else "",
                row.played_date.isoformat() if row.played_date else "",
                row.played_time.isoformat() if row.played_time else "",
                row.duration_seconds if row.duration_seconds is not None else "",
                row.confidence if row.confidence is not None else "",
                row.status,
                row.screenshot_url or "",
                row.screenshot_path or "",
                "true" if (row.screenshot_url or row.screenshot_path) else "false",
                row.created_at.isoformat() if row.created_at else "",
            ]
        )

    filename = (
        f"playback_report_{payload.from_ts.date().isoformat()}_"
        f"{payload.to_ts.date().isoformat()}.csv"
    )

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post("/mock-detection", response_model=PlaybackLogOut, status_code=status.HTTP_201_CREATED)
async def create_mock_detection(
    payload: MockDetectionCreate,
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> PlaybackLogOut:
    channel = await db.get(Channel, payload.channel_id)
    if channel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    advertiser = None
    if payload.advertiser_id is not None:
        advertiser = await db.get(Advertiser, payload.advertiser_id)
        if advertiser is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Advertiser not found",
            )

    played_at = ensure_timezone(payload.played_at or datetime.now(UTC))

    detection = Detection(
        channel_id=channel.id,
        advertiser_id=advertiser.id if advertiser else payload.advertiser_id,
        advertiser_name=payload.advertiser_name,
        video_name=payload.video_name,
        channel_name=channel.name,
        played_at=played_at,
        played_date=played_at.date(),
        played_time=played_at.time().replace(tzinfo=None),
        duration_seconds=payload.duration_seconds,
        confidence=payload.confidence,
        status=payload.status,
        screenshot_url=payload.screenshot_url,
        screenshot_path=payload.screenshot_path,
    )

    db.add(detection)
    await db.commit()
    await db.refresh(detection)

    channel.last_seen_at = datetime.now(UTC)
    if channel.is_active and channel.monitoring_enabled:
        channel.status = "linked"
    await db.commit()

    return serialize_playback_log(detection)


@router.post("/mock-detections/generate-sample", response_model=List[PlaybackLogOut])
async def generate_sample_detections(
    channel_id: UUID,
    advertiser_id: UUID | None = None,
    count: int = Query(default=5, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin),
) -> List[PlaybackLogOut]:
    channel = await db.get(Channel, channel_id)
    if channel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    advertiser = None
    if advertiser_id is not None:
        advertiser = await db.get(Advertiser, advertiser_id)
        if advertiser is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Advertiser not found",
            )

    created_rows: list[Detection] = []
    now = datetime.now(UTC)

    for index in range(count):
        played_at = now - timedelta(minutes=index * 2)
        detection = Detection(
            channel_id=channel.id,
            advertiser_id=advertiser.id if advertiser else None,
            advertiser_name=advertiser.name if advertiser else f"Sample Advertiser {index + 1}",
            video_name=advertiser.video_name if advertiser else f"Sample Video {index + 1}",
            channel_name=channel.name,
            played_at=played_at,
            played_date=played_at.date(),
            played_time=played_at.time().replace(tzinfo=None),
            duration_seconds=30,
            confidence=97.5 - index,
            status="matched" if index % 4 != 3 else "partial",
            screenshot_url=f"https://example.com/mock-evidence/{channel.id}/{index + 1}.jpg",
            screenshot_path=None,
        )
        db.add(detection)
        created_rows.append(detection)

    channel.last_seen_at = now
    if channel.is_active and channel.monitoring_enabled:
        channel.status = "linked"

    await db.commit()

    for row in created_rows:
        await db.refresh(row)

    return [serialize_playback_log(row) for row in created_rows]