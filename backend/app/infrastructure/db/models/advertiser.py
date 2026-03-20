#backend/app/infrastructure/db/models/advertiser.py
from __future__ import annotations

from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Date, DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base


class Advertiser(Base):
    """
    Consolidated ad asset registry model.

    Each row now represents one advertiser-owned ad/video asset.
    """

    __tablename__ = "advertisers"
    __table_args__ = (
        UniqueConstraint("name", "video_name", name="uq_advertisers_name_video_name"),
    )

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    video_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    video_file_name: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    contract_start_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    contract_end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    detections = relationship(
        "Detection",
        back_populates="advertiser",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Advertiser "
            f"id={self.id} "
            f"name={self.name!r} "
            f"video_name={self.video_name!r} "
            f"video_file_name={self.video_file_name!r}>"
        )