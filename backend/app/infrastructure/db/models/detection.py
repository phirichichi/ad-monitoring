from __future__ import annotations

from datetime import date, datetime, time
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

# These imports are for typing only.
# They remove editor warnings like:
# - 'Channel' is not defined
# - 'Advertiser' is not defined
# and avoid circular imports at runtime.
if TYPE_CHECKING:
    from app.infrastructure.db.models.advertiser import Advertiser
    from app.infrastructure.db.models.channel import Channel


class Detection(Base):
    """
    Playback log / detection record.

    This is the true reporting source for:
    - advertiser name
    - video name
    - channel played on
    - played timestamp
    - confidence
    - status
    - screenshot/evidence linkage
    """

    __tablename__ = "detections"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    channel_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    advertiser_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("advertisers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    advertiser_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    video_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    channel_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        server_default=func.now(),
    )

    played_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )

    played_time: Mapped[time | None] = mapped_column(
        Time(timezone=False),
        nullable=True,
    )

    duration_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="matched",
        server_default="matched",
    )

    screenshot_path: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )

    screenshot_url: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # FIX 1:
    # This is required because Channel.detections uses back_populates="channel"
    channel: Mapped["Channel"] = relationship(
        "Channel",
        back_populates="detections",
    )

    # FIX 2:
    # This is required because Advertiser.detections likely uses
    # back_populates="advertiser"
    advertiser: Mapped["Advertiser | None"] = relationship(
        "Advertiser",
        back_populates="detections",
    )

    def __repr__(self) -> str:
        return (
            f"<Detection id={self.id} "
            f"channel_name={self.channel_name!r} "
            f"advertiser_name={self.advertiser_name!r} "
            f"video_name={self.video_name!r} "
            f"status={self.status!r}>"
        )