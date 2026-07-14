from __future__ import annotations

import unittest

from cerebro_rag.migrations import MIGRATIONS


class MigrationTest(unittest.TestCase):
    def test_chat_schema_is_isolated_and_idempotent(self) -> None:
        migration_sql = "\n".join(sql for _, sql in MIGRATIONS)

        self.assertIn("CREATE TABLE IF NOT EXISTS rag_chat_sessions", migration_sql)
        self.assertIn("CREATE TABLE IF NOT EXISTS rag_chat_messages", migration_sql)
        self.assertIn("UNIQUE (session_id, client_message_id)", migration_sql)
        self.assertIn("ON DELETE CASCADE", migration_sql)
        self.assertNotIn("cerebro_conversations", migration_sql)
        self.assertNotIn("repair_knowledge", migration_sql)

    def test_parallel_services_serialize_migrations(self) -> None:
        from cerebro_rag.migrations import MIGRATION_LOCK_SQL

        self.assertIn("pg_advisory_xact_lock", MIGRATION_LOCK_SQL)


if __name__ == "__main__":
    unittest.main()
