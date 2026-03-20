from __future__ import annotations

from uuid import uuid4

from sqlalchemy import String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class Playlist(Base):
    __tablename__ = "playlists"

    # Primary key for playlist record
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Basic playlist details
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Uploaded video metadata
    video_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    video_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Stored schedule grid from frontend
    # Saved as JSON array of rows
    schedule_rows: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)

    def __repr__(self) -> str:
        return f"<Playlist id={self.id} name={self.name!r}>"