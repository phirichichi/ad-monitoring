from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

# Only imported for type-checking/editor support.
# This avoids circular import problems at runtime.
if TYPE_CHECKING:
    from app.infrastructure.db.models.detection import Detection


class Channel(Base):
    """
    Channel model used to connect a broadcast source to the monitoring pipeline.
    """

    __tablename__ = "channels"
    __table_args__ = (
        UniqueConstraint("name", name="uq_channels_name"),
        UniqueConstraint("slug", name="uq_channels_slug"),
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

    # Required by your frontend Channels page.
    slug: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    # Required by your frontend Channels page.
    stream_url: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
    )

    timezone: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Africa/Lusaka",
        server_default="Africa/Lusaka",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    monitoring_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="unknown",
        server_default="unknown",
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="unknown",
        server_default="unknown",
    )

    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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

    # Reverse side of Detection.channel
    detections: Mapped[list["Detection"]] = relationship(
        "Detection",
        back_populates="channel",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Channel "
            f"id={self.id} "
            f"name={self.name!r} "
            f"slug={self.slug!r} "
            f"source_type={self.source_type!r} "
            f"is_active={self.is_active} "
            f"monitoring_enabled={self.monitoring_enabled}>"
        )