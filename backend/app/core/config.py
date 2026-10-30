from pydantic_settings import BaseSettings
from pydantic import Field
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SentinelAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = Field(
        default="sentinel-ai-super-secret-key-change-in-production-2024",
        env="SECRET_KEY"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./sentinelai.db"

    # ML
    MODEL_PATH: str = os.path.join(os.path.dirname(__file__), "..", "ml", "models")

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
