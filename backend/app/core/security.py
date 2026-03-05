# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Dict

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings  # ✅ uses your settings (JWT secret, algo, expiry)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(
    *,
    subject: str,
    role: str,
    secret_key: str,
    algorithm: str,
    expires_delta: timedelta,
    token_type: str,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    to_encode: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": token_type,  # "access" | "refresh"
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def create_access_token(*, subject: str, role: str) -> str:
    return create_token(
        subject=subject,
        role=role,
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="access",
    )


def create_refresh_token(*, subject: str, role: str) -> str:
    return create_token(
        subject=subject,
        role=role,
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expires_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh",
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None