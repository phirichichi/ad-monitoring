from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.
    """
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
    """
    Create a JWT token with standard auth claims.
    """
    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    to_encode: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": token_type,  # "access" or "refresh"
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def create_access_token(*, subject: str, role: str) -> str:
    """
    Create a short-lived access token.
    """
    return create_token(
        subject=subject,
        role=role,
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="access",
    )


def create_refresh_token(*, subject: str, role: str) -> str:
    """
    Create a longer-lived refresh token.
    """
    return create_token(
        subject=subject,
        role=role,
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expires_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh",
    )


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """
    Decode a JWT token using the configured secret and algorithm.

    Returns None if invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None
