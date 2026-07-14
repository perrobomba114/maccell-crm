from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal
from uuid import UUID


JobStatus = Literal["PENDING", "RUNNING", "READY", "PARTIAL", "FAILED", "RETRYING"]


@dataclass(frozen=True, slots=True)
class IngestionJob:
    id: UUID
    job_type: str
    source_key: str
    status: JobStatus
    attempts: int
    lease_until: datetime | None
