from __future__ import annotations

from enum import StrEnum


class Authority(StrEnum):
    CONFIRMED_SUCCESS = "CONFIRMED_SUCCESS"
    INCOMPLETE = "INCOMPLETE"
    FAILED = "FAILED"


def classify_authority(status_name: str, prior_status_names: list[str], diagnosis: str) -> Authority:
    if not diagnosis.strip():
        return Authority.INCOMPLETE

    current = status_name.strip().casefold()
    prior = {value.strip().casefold() for value in prior_status_names}
    if current == "no reparado":
        return Authority.FAILED
    if current == "finalizado ok" or "finalizado ok" in prior:
        return Authority.CONFIRMED_SUCCESS
    return Authority.INCOMPLETE
