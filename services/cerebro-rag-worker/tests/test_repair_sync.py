from __future__ import annotations

import unittest
from datetime import UTC, datetime
from unittest.mock import MagicMock

from cerebro_rag.repair_cursor import REPAIR_QUALITY_POLICY_VERSION, RepairCursor
from cerebro_rag.repair_sync import (
    ACTIVE_REPAIR_IDS_QUERY,
    _load_cursor,
    _is_optional_permission_denied,
    _is_permission_denied,
)


class RepairSyncCursorTest(unittest.TestCase):
    def test_permission_denied_detection_accepts_postgres_sqlstate(self) -> None:
        error = RuntimeError("permission denied for table repair_learning_records")
        error.sqlstate = "42501"  # type: ignore[attr-defined]

        self.assertTrue(_is_permission_denied(error))

    def test_permission_denied_detection_does_not_mask_other_database_errors(self) -> None:
        self.assertFalse(_is_permission_denied(RuntimeError("connection refused")))

    def test_active_repair_retirement_permission_is_optional(self) -> None:
        self.assertTrue(
            _is_optional_permission_denied(
                "retire_active_repairs",
                RuntimeError("permission denied"),
            )
        )

    def test_source_read_permission_is_not_optional(self) -> None:
        self.assertFalse(
            _is_optional_permission_denied(
                "source_export",
                RuntimeError("permission denied"),
            )
        )

    def test_active_repairs_are_reconciled_out_of_confirmed_evidence(self) -> None:
        self.assertIn('"statusId" IN (1, 2, 3, 4)', ACTIVE_REPAIR_IDS_QUERY)

    def test_cursor_orders_equal_timestamps_by_repair_id(self) -> None:
        updated_at = datetime(2026, 7, 14, 5, 0, tzinfo=UTC)
        first = RepairCursor(updated_at, "repair-a")
        second = RepairCursor(updated_at, "repair-b")

        self.assertLess(first, second)

    def test_cursor_round_trips_through_json(self) -> None:
        cursor = RepairCursor(datetime(2026, 7, 14, 5, 0, tzinfo=UTC), "repair-9")

        self.assertEqual(RepairCursor.from_json(cursor.to_json()), cursor)

    def test_cursor_resets_once_when_quality_policy_changes(self) -> None:
        stale = {
            "updatedAt": "2026-07-14T05:00:00+00:00",
            "id": "repair-9",
            "policyVersion": REPAIR_QUALITY_POLICY_VERSION - 1,
        }
        reset = RepairCursor.from_json(stale)

        self.assertEqual(reset, RepairCursor.initial())
        self.assertEqual(reset.to_json()["policyVersion"], REPAIR_QUALITY_POLICY_VERSION)

    def test_policy_reset_is_persisted_even_when_no_repairs_are_loaded(self) -> None:
        connection = MagicMock()

        def execute(query: str, *_: object) -> MagicMock:
            result = MagicMock()
            if query.strip().startswith("SELECT cursor"):
                result.fetchone.return_value = (
                    {
                        "updatedAt": "2026-07-14T05:00:00+00:00",
                        "id": "repair-9",
                        "policyVersion": REPAIR_QUALITY_POLICY_VERSION - 1,
                    },
                )
            return result

        connection.execute.side_effect = execute

        self.assertEqual(_load_cursor(connection), RepairCursor.initial())
        self.assertTrue(
            any("SET cursor = %s" in call.args[0] for call in connection.execute.call_args_list)
        )
        connection.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
