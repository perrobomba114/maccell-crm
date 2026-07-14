from __future__ import annotations

from collections.abc import Sequence

from psycopg import Connection

MIGRATION_LOCK_SQL = "SELECT pg_advisory_xact_lock(hashtext('maccell-cerebro-rag-migrations'))"

MIGRATIONS: Sequence[tuple[str, str]] = (
    (
        "2026-07-14-chat-v2",
        """
        CREATE TABLE IF NOT EXISTS rag_chat_sessions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id text NOT NULL,
            title varchar(80) NOT NULL DEFAULT 'Nuevo diagnóstico',
            brand varchar(60) NOT NULL,
            model varchar(120) NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS rag_chat_sessions_user_updated
            ON rag_chat_sessions (user_id, updated_at DESC);

        CREATE TABLE IF NOT EXISTS rag_chat_messages (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id uuid NOT NULL REFERENCES rag_chat_sessions(id) ON DELETE CASCADE,
            client_message_id varchar(180) NOT NULL,
            role varchar(10) NOT NULL CHECK (role IN ('user', 'assistant')),
            content text NOT NULL,
            attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
            sources jsonb NOT NULL DEFAULT '[]'::jsonb,
            prompt_version varchar(80),
            provider varchar(80),
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (session_id, client_message_id)
        );

        CREATE INDEX IF NOT EXISTS rag_chat_messages_session_created
            ON rag_chat_messages (session_id, created_at, id);
        """,
    ),
    (
        "2026-07-14-chat-repair-guided",
        """
        ALTER TABLE rag_chat_sessions
            ADD COLUMN IF NOT EXISTS repair_id text,
            ADD COLUMN IF NOT EXISTS ticket_number varchar(80);

        CREATE INDEX IF NOT EXISTS rag_chat_sessions_repair
            ON rag_chat_sessions (repair_id, updated_at DESC)
            WHERE repair_id IS NOT NULL;

        ALTER TABLE rag_chat_messages
            ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
        """,
    ),
    (
        "2026-07-14-page-technical-metadata",
        """
        ALTER TABLE rag_pages
            ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS vision_summary text,
            ADD COLUMN IF NOT EXISTS vision_cached_at timestamptz;

        CREATE INDEX IF NOT EXISTS rag_pages_extraction_quality
            ON rag_pages ((metadata->>'extraction_quality'));

        UPDATE rag_documents
        SET model_family = 'GALAXY A12'
        WHERE normalized_brand = 'SAMSUNG'
          AND normalized_model IN ('SM-A125M', 'GALAXY A12', 'A12');
        """,
    ),
    (
        "2026-07-14-device-alias-catalog",
        """
        CREATE TABLE IF NOT EXISTS rag_device_aliases (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            normalized_brand text NOT NULL,
            canonical_model text NOT NULL,
            normalized_alias text NOT NULL,
            source_path text NOT NULL,
            confidence real NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (normalized_brand, canonical_model, normalized_alias)
        );

        CREATE INDEX IF NOT EXISTS rag_device_aliases_lookup
            ON rag_device_aliases (normalized_brand, normalized_alias, canonical_model);
        """,
    ),
)


def apply_migrations(connection: Connection[object]) -> None:
    connection.execute(MIGRATION_LOCK_SQL)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS rag_schema_migrations (
            version text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    for version, sql in MIGRATIONS:
        applied = connection.execute(
            "SELECT 1 FROM rag_schema_migrations WHERE version = %s",
            (version,),
        ).fetchone()
        if applied:
            continue
        connection.execute(sql)
        connection.execute(
            "INSERT INTO rag_schema_migrations (version) VALUES (%s)",
            (version,),
        )
    connection.commit()
