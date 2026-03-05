"""
Quick dev helper: ensure tables exist, then create/update an admin user.

Run (from backend/):
  python -m scripts.create_admin

Reads backend/.env via python-dotenv.
"""

import os
import asyncio
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.core.security import get_password_hash
from app.infrastructure.db.models.user import User
from app.infrastructure.db.base import Base  # declarative base


def _load_env() -> None:
    # Load .env from current working directory (backend/)
    load_dotenv(override=False)

    # Also try ../.env relative to scripts/ for safety
    here = os.path.abspath(os.path.dirname(__file__))
    load_dotenv(os.path.join(here, "..", ".env"), override=False)


async def ensure_tables(engine) -> None:
    # DEV ONLY: create missing tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def upsert_admin(db: AsyncSession) -> None:
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com").strip()
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")
    admin_role = os.getenv("ADMIN_ROLE", "admin")

    if not admin_email:
        raise RuntimeError("ADMIN_EMAIL is empty")
    if not admin_password:
        raise RuntimeError("ADMIN_PASSWORD is empty")

    password_hash = get_password_hash(admin_password)

    res = await db.execute(select(User).where(User.email == admin_email))
    user = res.scalar_one_or_none()

    if not user:
        user = User(
            email=admin_email,
            password_hash=password_hash,
            role=admin_role,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        print(f"✅ Created admin: {admin_email}")
        print(f"   Password: {admin_password}")
        return

    user.password_hash = password_hash
    user.role = admin_role
    user.is_active = True
    await db.commit()
    print(f"✅ Updated admin: {admin_email}")
    print(f"   Password: {admin_password}")


async def main() -> None:
    _load_env()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in backend/.env")

    engine = create_async_engine(database_url, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    await ensure_tables(engine)

    async with SessionLocal() as db:
        await upsert_admin(db)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())