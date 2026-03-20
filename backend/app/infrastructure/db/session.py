from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.infrastructure.db.base import Base
import app.infrastructure.db.models  # noqa: F401  Ensures all models are registered


@dataclass
class DBManager:
    engine: Optional[AsyncEngine] = None
    sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None

    async def initialize(self) -> None:
        if self.engine is not None and self.sessionmaker is not None:
            return

        if not settings.DATABASE_URL:
            raise RuntimeError(
                "settings.DATABASE_URL is empty. Check backend/.env and config loading."
            )

        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
        )
        self.sessionmaker = async_sessionmaker(
            self.engine,
            expire_on_commit=False,
        )

        # Dev convenience: auto-create tables.
        # Later you can replace this with Alembic-only migrations.
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        if self.engine is not None:
            await self.engine.dispose()

        self.engine = None
        self.sessionmaker = None

    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        if self.sessionmaker is None:
            raise RuntimeError(
                "DB not initialized. Did you forget to call db_manager.initialize()?"
            )

        async with self.sessionmaker() as session:
            yield session


db_manager = DBManager()