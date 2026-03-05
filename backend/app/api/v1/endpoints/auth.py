# app/api/v1/endpoints/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.infrastructure.db.models.user import User

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()

    # ✅ use password_hash (your model field)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive account")

    access = create_access_token(subject=str(user.id), role=getattr(user, "role", "client_viewer"))
    refresh = create_refresh_token(subject=str(user.id), role=getattr(user, "role", "client_viewer"))

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "expires_in": 60 * 15,
    }