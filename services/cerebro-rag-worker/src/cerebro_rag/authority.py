from __future__ import annotations

from enum import StrEnum


class Authority(StrEnum):
    CONFIRMED_SUCCESS = "CONFIRMED_SUCCESS"
    INCOMPLETE = "INCOMPLETE"
    FAILED = "FAILED"


class RepairOutcome(StrEnum):
    REPAIRED = "REPAIRED"
    UNREPAIRED = "UNREPAIRED"
    UNKNOWN = "UNKNOWN"


_REPAIRED_STATUSES = {"finalizado ok", "reparado"}
_UNREPAIRED_STATUSES = {"no reparado", "sin reparacion", "sin reparación"}
_REOPENED_STATUSES = {
    "pendiente",
    "ingresada",
    "tomada",
    "tomada por tecnico",
    "tomada por técnico",
    "en proceso",
    "pausado",
    "pausada",
}


def latest_repair_outcome(
    status_name: str,
    prior_status_names: list[str],
) -> RepairOutcome:
    """Return the last technical outcome, ignoring later administrative closure."""
    timeline = [*prior_status_names, status_name]
    for value in reversed(timeline):
        normalized = value.strip().casefold()
        if normalized in _REOPENED_STATUSES:
            return RepairOutcome.UNKNOWN
        if normalized in _REPAIRED_STATUSES:
            return RepairOutcome.REPAIRED
        if normalized in _UNREPAIRED_STATUSES:
            return RepairOutcome.UNREPAIRED
    return RepairOutcome.UNKNOWN


def classify_authority(
    status_name: str,
    prior_status_names: list[str],
    diagnosis: str,
    learning_authority: str | None,
) -> Authority:
    outcome = latest_repair_outcome(status_name, prior_status_names)
    if outcome == RepairOutcome.UNREPAIRED:
        return Authority.FAILED
    if not diagnosis.strip():
        return Authority.INCOMPLETE
    if learning_authority == Authority.CONFIRMED_SUCCESS.value:
        return (
            Authority.CONFIRMED_SUCCESS
            if outcome == RepairOutcome.REPAIRED
            else Authority.INCOMPLETE
        )
    return Authority.INCOMPLETE
