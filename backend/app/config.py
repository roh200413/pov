from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PoC AI Inference Tool API"
    database_url: str = "sqlite:///./poc.db"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    Path("storage").mkdir(parents=True, exist_ok=True)
    return settings
