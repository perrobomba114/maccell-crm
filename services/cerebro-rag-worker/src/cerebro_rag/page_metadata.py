from __future__ import annotations

import re
from typing import TypedDict


class TechnicalPageMetadata(TypedDict):
    section: str
    subsystems: list[str]
    nets: list[str]
    components: list[str]
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


def technical_page_metadata(text: str) -> TechnicalPageMetadata:
    clean_lines = [line.strip() for line in text.splitlines() if line.strip()]
    section = clean_lines[0][:160] if clean_lines else ""
    alphanumeric = sum(character.isalnum() or character.isspace() for character in text)
    readable_ratio = alphanumeric / max(1, len(text))
    quality = "LOW" if len(text.strip()) < 40 or readable_ratio < 0.65 else "HIGH"
    return {
        "section": section,
        "subsystems": [name for name, pattern in SUBSYSTEM_PATTERNS if pattern.search(text)],
        "nets": sorted(set(NET_PATTERN.findall(text.upper())))[:80],
        "components": sorted(set(COMPONENT_PATTERN.findall(text.upper())))[:120],
        "extraction_quality": quality,
    }
