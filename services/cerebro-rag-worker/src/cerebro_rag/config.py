from __future__ import annotations

from pathlib import Path

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, extra="ignore")

    source_database_url: SecretStr = Field(alias="SOURCE_DATABASE_URL")
    rag_database_url: SecretStr = Field(alias="RAG_DATABASE_URL")
    internal_api_secret: SecretStr = Field(alias="INTERNAL_API_SECRET")
    library_root: Path = Field(default=Path("/library"), alias="LIBRARY_ROOT")
    page_cache_root: Path = Field(default=Path("/page-cache"), alias="PAGE_CACHE_ROOT")
    embedding_model: str = Field(default="BAAI/bge-m3", alias="EMBEDDING_MODEL")
    batch_size: int = Field(default=8, ge=1, le=64, alias="BATCH_SIZE")
    remote_embedding_urls: str = Field(default="", alias="REMOTE_EMBEDDING_URLS")
    remote_embedding_secret: SecretStr | None = Field(default=None, alias="REMOTE_EMBEDDING_SECRET")
    remote_embedding_timeout_seconds: float = Field(
        default=30.0,
        ge=1.0,
        le=120.0,
        alias="REMOTE_EMBEDDING_TIMEOUT_SECONDS",
    )

    @property
    def remote_embedding_endpoints(self) -> tuple[str, ...]:
        return tuple(url.strip().rstrip("/") for url in self.remote_embedding_urls.split(",") if url.strip())

    @property
    def embedding_api_secret(self) -> str:
        if self.remote_embedding_secret is not None:
            return self.remote_embedding_secret.get_secret_value()
        return self.internal_api_secret.get_secret_value()

    @model_validator(mode="after")
    def validate_storage_roots(self) -> "WorkerSettings":
        if not self.library_root.is_dir():
            raise ValueError("LIBRARY_ROOT must be an existing directory")
        if not self.page_cache_root.is_dir():
            raise ValueError("PAGE_CACHE_ROOT must be an existing directory")
        return self
