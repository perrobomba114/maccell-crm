from __future__ import annotations

import unittest
from datetime import UTC, datetime

from cerebro_rag.repair_cursor import RepairCursor


class RepairSyncCursorTest(unittest.TestCase):
    def test_cursor_orders_equal_timestamps_by_repair_id(self) -> None:
        updated_at = datetime(2026, 7, 14, 5, 0, tzinfo=UTC)
        first = RepairCursor(updated_at, "repair-a")
        second = RepairCursor(updated_at, "repair-b")

        self.assertLess(first, second)

    def test_cursor_round_trips_through_json(self) -> None:
        cursor = RepairCursor(datetime(2026, 7, 14, 5, 0, tzinfo=UTC), "repair-9")

        self.assertEqual(RepairCursor.from_json(cursor.to_json()), cursor)


if __name__ == "__main__":
    unittest.main()
