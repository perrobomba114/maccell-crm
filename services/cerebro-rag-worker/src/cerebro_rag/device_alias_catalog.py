from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from psycopg import Connection

from cerebro_rag.normalize import normalize_brand, normalize_model


SAMSUNG_CODE_PATTERN = re.compile(
    r"(?<![A-Z0-9])(?:SM|GT)[\s_-]*([A-Z]?\d{3,5}[A-Z]{0,3})(?![A-Z0-9])",
    re.IGNORECASE,
)
MOTOROLA_CODE_PATTERN = re.compile(r"(?<![A-Z0-9])(XT\d{4,5})(?:-\d)?(?![A-Z0-9])", re.IGNORECASE)


@dataclass(frozen=True, slots=True)
class DeviceAlias:
    brand: str
    canonical_model: str
    alias: str
    source_path: str


def _clean_model_alias(brand: str, value: str) -> str:
    clean = re.sub(r"[_\s-]+", " ", value.strip().upper())
    clean = re.sub(rf"^(?:{re.escape(brand)}|SAMSUNG)\s+", "", clean)
    return clean.strip(" -_./")


def _samsung_commercial_names(relative_path: Path) -> tuple[str, ...]:
    names: set[str] = set()
    for part in relative_path.parts:
        upper = part.upper()
        if "GALAXY" not in upper:
            continue
        without_codes = SAMSUNG_CODE_PATTERN.sub("", upper)
        commercial = _clean_model_alias("SAMSUNG", without_codes)
        commercial = re.sub(r"\.(?:PDF)$", "", commercial).strip()
        if commercial.startswith("GALAXY ") and len(commercial) > len("GALAXY "):
            names.add(commercial)
            names.add(commercial.removeprefix("GALAXY "))
    return tuple(sorted(names))


def _motorola_commercial_names(relative_path: Path) -> tuple[str, ...]:
    names: set[str] = set()
    for part in relative_path.parts:
        upper = part.upper()
        if not MOTOROLA_CODE_PATTERN.search(upper) or not re.search(r"\b(?:MOTO|MOTOROLA)\b", upper):
            continue
        without_codes = MOTOROLA_CODE_PATTERN.sub("", upper)
        without_noise = re.sub(r"\b(?:ESQUEMATICO|SCHEMATIC|COMPLETO|PCB|LAYOUT|PDF)\b", "", without_codes)
        commercial = re.sub(r"\bMOTOROLA\b", "MOTO", without_noise)
        commercial = re.sub(r"[^A-Z0-9+ ]+", " ", commercial)
        commercial = re.sub(r"\s+", " ", commercial).strip()
        if commercial.startswith("MOTO ") and len(commercial) > len("MOTO "):
            names.add(commercial)
            names.add(commercial.removeprefix("MOTO "))
    return tuple(sorted(names))


def aliases_from_pdf_path(relative_path: Path) -> tuple[DeviceAlias, ...]:
    brand = normalize_brand(relative_path.parts[0] if relative_path.parts else "")
    path_text = " ".join(relative_path.parts)
    if brand == "SAMSUNG":
        all_codes = {
            f"{match.group(0)[:2].upper()}-{match.group(1).upper()}"
            for match in SAMSUNG_CODE_PATTERN.finditer(path_text)
        }
        declared_codes = {
            f"{match.group(0)[:2].upper()}-{match.group(1).upper()}"
            for part in relative_path.parts if "GALAXY" in part.upper()
            for match in SAMSUNG_CODE_PATTERN.finditer(part)
        }
        declared_families = {
            match.group(1)
            for code in declared_codes
            if (match := re.fullmatch(r"((?:SM|GT)-[A-Z]?\d{3,5})[A-Z]{0,3}", code))
        }
        codes = {
            code for code in all_codes
            if any(code.startswith(family) for family in declared_families)
        }
        aliases = _samsung_commercial_names(relative_path)
    elif brand == "MOTOROLA":
        codes = {match.group(1).upper() for match in MOTOROLA_CODE_PATTERN.finditer(path_text)}
        aliases = _motorola_commercial_names(relative_path)
    else:
        return ()
    return tuple(
        DeviceAlias(
            brand=brand,
            canonical_model=normalize_model(brand, code),
            alias=_clean_model_alias(brand, alias),
            source_path=relative_path.as_posix(),
        )
        for code in sorted(codes)
        for alias in aliases
    )


def catalog_pdf_aliases(library_root: Path, connection: Connection[object]) -> int:
    root = library_root.resolve(strict=True)
    aliases = {
        (alias.brand, alias.canonical_model, alias.alias): alias
        for path in root.rglob("*")
        if path.is_file() and path.suffix.casefold() == ".pdf"
        for alias in aliases_from_pdf_path(path.relative_to(root))
    }
    for alias in aliases.values():
        connection.execute(
            """
            INSERT INTO rag_device_aliases (
                normalized_brand, canonical_model, normalized_alias, source_path, confidence
            ) VALUES (%s, %s, %s, %s, 1)
            ON CONFLICT (normalized_brand, canonical_model, normalized_alias)
            DO UPDATE SET source_path = EXCLUDED.source_path, confidence = 1, updated_at = now()
            """,
            (alias.brand, alias.canonical_model, alias.alias, alias.source_path),
        )
    connection.commit()
    return len(aliases)
