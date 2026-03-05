from __future__ import annotations

from uuid import uuid4

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class Advertiser(Base):
    __tablename__ = "advertisers"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<Advertiser id={self.id} name={self.name!r}>"