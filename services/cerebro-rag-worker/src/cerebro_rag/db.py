from __future__ import annotations

from psycopg_pool import ConnectionPool

from cerebro_rag.config import WorkerSettings


class DatabasePools:
    def __init__(self, settings: WorkerSettings) -> None:
        self.source = ConnectionPool(
            settings.source_database_url.get_secret_value(),
            min_size=1,
            max_size=2,
            kwargs={"autocommit": False},
        )
        self.rag = ConnectionPool(
            settings.rag_database_url.get_secret_value(),
            min_size=1,
            max_size=8,
            kwargs={"autocommit": False},
        )

    def close(self) -> None:
        self.source.close()
        self.rag.close()
