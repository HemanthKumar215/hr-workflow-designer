from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite works out of the box for local dev; use Postgres in Docker/production:
    # postgresql+psycopg://user:pass@host:5432/dbname
    database_url: str = "sqlite:///./hr_workflow.db"

    jwt_secret: str = "dev-only-secret-change-me-in-production-0000"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    # Comma-separated list of allowed frontend origins.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Seed demo users and template workflows on startup when the DB is empty.
    seed_demo_data: bool = True

    # How often (seconds) the background job auto-approves overdue approvals. 0 disables it.
    sla_sweep_interval_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
