from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/docchat"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM Settings
    ANTHROPIC_API_KEY: str = ""
    LLM_PROVIDER: str = "fake"  # 'anthropic' or 'fake'
    LLM_MODEL: str = "claude-3-5-sonnet-20241022"
    LLM_FAST_MODEL: str = "claude-3-5-haiku-20241022"

    # Embeddings & Reranking
    EMBED_PROVIDER: str = "hash"  # 'hash', 'sentence_transformers', or 'fake'
    EMBED_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBED_DIM: int = 384
    RERANK_MODEL: str = "BAAI/bge-reranker-base"
    RELEVANCE_THRESHOLD: float = 0.35

    # Auth & Tokens
    JWT_SECRET: str = "insecure-dev-jwt-secret-please-change-to-32-bytes-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Storage & Upload limits
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "/tmp/docchat/uploads"
    MAX_UPLOAD_MB: int = 25
    MAX_PAGES: int = 300

    # Abuse controls
    RATE_LIMIT_PER_MINUTE: int = 30
    CHAT_RATE_LIMIT_PER_MINUTE: int = 10
    DAILY_QUESTION_QUOTA: int = 100


settings = Settings()
