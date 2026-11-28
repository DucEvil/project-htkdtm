"""Cấu hình ứng dụng – đọc từ biến môi trường (.env)."""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


def _resolve_project_root(config_path: Path) -> Path | None:
    """Trả về thư mục gốc nhóm khi chạy local (src/backend/app/config.py); None trong Docker."""
    parents = config_path.resolve().parents
    if len(parents) > 3 and parents[1].name == "backend" and parents[2].name == "src":
        return parents[3]
    return None


def _resolve_env_file(config_path: Path) -> Path | None:
    """Chỉ đọc .env của nhóm khi chạy local; trong Docker dùng biến môi trường tiến trình."""
    project_root = _resolve_project_root(config_path)
    if project_root is None:
        return None
    env_path = project_root / ".env"
    return env_path if env_path.is_file() else None


def _resolve_default_data_dir(config_path: Path) -> Path:
    """Đường dẫn DATA_DIR mặc định tương thích local (src/database) và Docker (/data)."""
    project_root = _resolve_project_root(config_path)
    if project_root is not None:
        return project_root / "src" / "database"
    return Path("/data")


_CONFIG_PATH = Path(__file__).resolve()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_file(_CONFIG_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "viviet"
    POSTGRES_USER: str = "viviet"
    POSTGRES_PASSWORD: str = "changeme"
    DATABASE_URL: str = ""
    DATA_DIR: Path = _resolve_default_data_dir(_CONFIG_PATH)

    # Auth
    SECRET_KEY: str = "changeme-generate-a-random-secret-key"
    ALGORITHM: Literal["HS256"] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, gt=0, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, gt=0, le=30)

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""

    # AI
    RECOMMENDATION_ALGORITHM_VERSION: str = "content_v1"

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return URL.create(
            "postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        ).render_as_string(hide_password=False)


settings = Settings()
