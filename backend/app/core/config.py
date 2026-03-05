from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "Ad Monitoring System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str
    REDIS_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Accept either:
    # BACKEND_CORS_ORIGINS=http://localhost:5173
    # or comma-separated:
    # BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> List[str]:
        raw = (self.BACKEND_CORS_ORIGINS or "").strip()
        if not raw:
            return []
        return [o.strip() for o in raw.split(",") if o.strip()]


settings = Settings()