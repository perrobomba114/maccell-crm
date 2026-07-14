from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass(frozen=True, order=True, slots=True)
class RepairCursor:
    updated_at: datetime
    repair_id: str

    @classmethod
    def initial(cls) -> "RepairCursor":
        return cls(datetime(1970, 1, 1, tzinfo=UTC), "")

    @classmethod
    def from_json(cls, value: object) -> "RepairCursor":
        if not isinstance(value, dict):
            return cls.initial()
        updated_at = value.get("updatedAt")
        repair_id = value.get("id")
        if not isinstance(updated_at, str) or not isinstance(repair_id, str):
            return cls.initial()
        return cls(datetime.fromisoformat(updated_at), repair_id)

    def to_json(self) -> dict[str, str]:
        return {"updatedAt": self.updated_at.isoformat(), "id": self.repair_id}
