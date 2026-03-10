from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.infrastructure.db.models.user import User

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def normalize_role(value: object) -> str:
    if value is None:
        return "client"

    role = str(value).strip().lower()

    if role == "admin":
        return "admin"

    if role == "operator":
        return "operator"

    if role == "client":
        return "client"

    return "client"


@router.post("/auth/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = str(payload.email).strip().lower()

    res = await db.execute(select(User).where(User.email == normalized_email))
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account",
        )

    normalized_role = normalize_role(user.role)

    access = create_access_token(
        subject=str(user.id),
        role=normalized_role,
    )
    refresh = create_refresh_token(
        subject=str(user.id),
        role=normalized_role,
    )

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "expires_in": 60 * 15,
    }