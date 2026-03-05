from __future__ import annotations

from uuid import uuid4

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base


class Advertisement(Base):
    __tablename__ = "advertisements"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    advertiser_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("advertisers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    advertiser = relationship("Advertiser", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Advertisement id={self.id} title={self.title!r} advertiser_id={self.advertiser_id}>"