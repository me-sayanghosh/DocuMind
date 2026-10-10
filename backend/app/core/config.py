import os
from typing import Any, List, Union

from pydantic import field_validator
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
    DATABASE_URL: str = "sqlite+aiosqlite:///./docchat.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM Settings
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_PROVIDER: str = "fake"  # 'anthropic', 'gemini', or 'fake'
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_FAST_MODEL: str = "gemini-2.5-flash"

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

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def resolve_database_url(cls, v: Any) -> Any:
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        default_sqlite_path = os.path.join(backend_dir, "docchat.db")

        if isinstance(v, str):
            # If pointing to localhost postgres, check if postgres is actually listening
            if ("localhost:5432" in v or "127.0.0.1:5432" in v) and os.path.exists(default_sqlite_path):
                import socket

                try:
                    with socket.create_connection(("127.0.0.1", 5432), timeout=0.1):
                        pass
                except (OSError, ConnectionRefusedError, socket.timeout):
                    # Postgres is not running locally; fallback cleanly to sqlite
                    return f"sqlite+aiosqlite:///{default_sqlite_path}"

            # If sqlite path is relative, resolve it to an absolute path
            if ("sqlite" in v) and (":///" in v):
                scheme, path = v.split(":///", 1)
                if not os.path.isabs(path) and not path.startswith(":memory:"):
                    clean_path = path[2:] if path.startswith("./") else path
                    if os.path.exists(clean_path):
                        return f"{scheme}:///{os.path.abspath(clean_path)}"
                    backend_db = os.path.join(backend_dir, clean_path)
                    if os.path.exists(backend_db):
                        return f"{scheme}:///{backend_db}"
                    return f"{scheme}:///{os.path.abspath(clean_path)}"

        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    res = json.loads(v)
                    if isinstance(res, list):
                        return res
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
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

    # Email & Notifications
    EMAILS_ENABLED: bool = True
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_FROM_EMAIL: str = "notifications@documind.app"
    SMTP_FROM_NAME: str = "DocuMind"
    RESEND_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"


settings = Settings()
