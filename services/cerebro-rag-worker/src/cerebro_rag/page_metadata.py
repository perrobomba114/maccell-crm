from __future__ import annotations

import re
from typing import TypedDict

INDEX_SCHEMA_VERSION = "technical-flow-v2"


def document_metadata_current(status: str, schema_version: str | None) -> bool:
    return status == "READY" and schema_version == INDEX_SCHEMA_VERSION


class TechnicalPageMetadata(TypedDict):
    section: str
    procedure_type: str
    subsystems: list[str]
    nets: list[str]
    components: list[str]
    actions: list[str]
    expected_values: list[str]
    embedding_context: str
    extraction_quality: str


SUBSYSTEM_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("POWER", re.compile(r"\b(?:POWER|PMIC|VBAT|VDD|BUCK|LDO)\b", re.IGNORECASE)),
    ("BATTERY", re.compile(r"\b(?:BATTERY|BATT|NTC)\b", re.IGNORECASE)),
    ("CHARGING", re.compile(r"\b(?:CHARG|USB|VBUS|DOCK)\b", re.IGNORECASE)),
    ("BOOT", re.compile(r"\b(?:BOOT|RESET|CLOCK|NAND|CPU)\b", re.IGNORECASE)),
    ("DISPLAY", re.compile(r"\b(?:DISPLAY|LCD|OLED|BACKLIGHT|MIPI)\b", re.IGNORECASE)),
    ("RF", re.compile(r"\b(?:RF|BASEBAND|ANTENNA|WLAN|SIM)\b", re.IGNORECASE)),
)
NET_PATTERN = re.compile(r"\b(?:PP|VDD|VBAT|VBUS|USB|PMU|AP)_[A-Z0-9_]{2,}\b")
COMPONENT_PATTERN = re.compile(r"\b[A-Z]{1,3}\d{3,5}\b")
SERVICE_SECTION_PATTERN = re.compile(
    r"(?im)^\s*\d+-\d+(?:-\d+)?\.\s*([^\r\n]{2,100})"
)
ACTION_PATTERN = re.compile(
    r"^(?:CHECK|REPLACE|CHANGE|RECONNECT|RESOLDER|CHARGING|POWER-ON)", re.IGNORECASE
)
EXPECTED_VALUE_PATTERN = re.compile(
    r"(?:\b[A-Z][A-Z0-9_-]*\s*(?:=|>|<)\s*-?\d+(?:\.\d+)?\s*(?:V|A|MA|MHZ|KHZ)\b"
    r"|\bFREQUENCY\s+IS\s+\d+(?:\.\d+)?\s*(?:MHZ|KHZ)\b)",
    re.IGNORECASE,
)


def technical_page_metadata(text: str) -> TechnicalPageMetadata:
    clean_lines = [line.strip() for line in text.splitlines() if line.strip()]
    service_section = SERVICE_SECTION_PATTERN.search(text)
    section = service_section.group(1).strip()[:160] if service_section else (
        clean_lines[0][:160] if clean_lines else ""
    )
    troubleshooting = bool(
        service_section
        or re.search(r"\b(?:LEVEL 3 REPAIR|TROUBLE\s*SHOOT|DOES NOT POWER ON)\b", text, re.IGNORECASE)
    )
    actions = [line[:240] for line in clean_lines if ACTION_PATTERN.match(line)][:32]
    expected_values = list(dict.fromkeys(
        match.group(0).strip() for match in EXPECTED_VALUE_PATTERN.finditer(text)
    ))[:64]
    subsystems = [name for name, pattern in SUBSYSTEM_PATTERNS if pattern.search(text)]
    procedure_type = "TROUBLESHOOTING" if troubleshooting else "REFERENCE"
    embedding_context = " ".join(filter(None, (
        f"SECTION {section}",
        f"PROCEDURE {procedure_type}",
        f"SUBSYSTEMS {' '.join(subsystems)}" if subsystems else "",
        f"EXPECTED {'; '.join(expected_values)}" if expected_values else "",
        f"ACTIONS {'; '.join(actions[:12])}" if actions else "",
    )))[:2_000]
    alphanumeric = sum(character.isalnum() or character.isspace() for character in text)
    readable_ratio = alphanumeric / max(1, len(text))
    quality = "LOW" if len(text.strip()) < 40 or readable_ratio < 0.65 else "HIGH"
    return {
        "section": section,
        "procedure_type": procedure_type,
        "subsystems": subsystems,
        "nets": sorted(set(NET_PATTERN.findall(text.upper())))[:80],
        "components": sorted(set(COMPONENT_PATTERN.findall(text.upper())))[:120],
        "actions": actions,
        "expected_values": expected_values,
        "embedding_context": embedding_context,
        "extraction_quality": quality,
    }
