"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for authentication, SSE, and external adapters."""

    app_env: Literal["development", "test", "production"] = "development"
    jwt_secret: SecretStr = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_expire_minutes: int = Field(default=60, gt=0)
    auth_cookie_name: str = "access_token"
    auth_cookie_secure: bool = True
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    sse_heartbeat_seconds: float = Field(default=15.0, gt=0)
    database_url: str = "postgresql+asyncpg://onereport:onereport@localhost:5432/onereport"

    storage_bucket: str | None = None
    storage_prefix: str = "reports"
    public_data_base_url: str | None = None
    public_data_api_key: SecretStr | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
