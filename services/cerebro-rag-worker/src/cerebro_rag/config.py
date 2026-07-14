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
    batch_size: int = Field(default=8, ge=1, le=8, alias="BATCH_SIZE")

    @model_validator(mode="after")
    def validate_storage_roots(self) -> "WorkerSettings":
        if not self.library_root.is_dir():
            raise ValueError("LIBRARY_ROOT must be an existing directory")
        if not self.page_cache_root.is_dir():
            raise ValueError("PAGE_CACHE_ROOT must be an existing directory")
        return self
