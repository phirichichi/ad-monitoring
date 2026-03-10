from __future__ import annotations

from typing import List, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.core.security import get_password_hash
from app.infrastructure.db.models.user import User

router = APIRouter(prefix="/users", tags=["users"])

UserRole = Literal["admin", "operator", "client"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = "client"
    is_active: bool = True


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)) -> List[UserOut]:
    res = await db.execute(select(User).order_by(User.email.asc()))
    return list(res.scalars().all())


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserOut:
    user = User(
        email=str(payload.email).strip().lower(),
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )

    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="User already exists")

    await db.refresh(user)
    return user