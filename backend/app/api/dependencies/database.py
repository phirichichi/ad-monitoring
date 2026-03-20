from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.session import db_manager


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in db_manager.session():
        yield session