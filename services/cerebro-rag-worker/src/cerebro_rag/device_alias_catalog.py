from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from psycopg import Connection

from cerebro_rag.normalize import (
    LG_CHASSIS_MAP,
    MOTOROLA_XT_MAP,
    normalize_brand,
    normalize_model,
)

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
        upper = re.sub(r"\.(?:PDF|PCBE)$", "", upper)
        upper = re.sub(r"\b(?:ESQUEMATICO|SCHEMATIC|COMPLETO|TROUBLESHOOTING|MANUAL|SERVICE|PCB|LAYER)\b", "", upper)
        without_codes = SAMSUNG_CODE_PATTERN.sub("", upper)
        commercial = _clean_model_alias("SAMSUNG", without_codes).strip()
        commercial = re.sub(r"\s+", " ", commercial)
        if not commercial or commercial in ("SERIE A", "SERIE M", "SERIE S", "SERIE J", "SERIE Z", "SERIE NOTE", "PDF", "PCBE"):
            continue

        if commercial.startswith("GALAXY "):
            names.add(commercial)
            sub = commercial.removeprefix("GALAXY ").strip()
            if sub:
                names.add(sub)
        elif re.match(r"^[AMSJZF]\d{1,2}(?:\s*(?:5G|4G|PRO|CORE|PLUS|ULTRA|FE))?$", commercial):
            names.add(commercial)
            names.add(f"GALAXY {commercial}")
        elif re.match(r"^NOTE\s*\d{1,2}", commercial):
            names.add(commercial)
            names.add(f"GALAXY {commercial}")
    return tuple(sorted(names))


def _motorola_commercial_names(relative_path: Path) -> tuple[str, ...]:
    names: set[str] = set()
    for part in relative_path.parts:
        upper = part.upper()
        upper = re.sub(r"\.(?:PDF|PCBE)$", "", upper)
        upper = re.sub(r"\b(?:ESQUEMATICO|SCHEMATIC|COMPLETO|PCB|LAYOUT|DIAGRAM|TROUBLESHOOTING)\b", "", upper)
        without_codes = MOTOROLA_CODE_PATTERN.sub("", upper)
        commercial = re.sub(r"\bMOTOROLA\b", "MOTO", without_codes)
        commercial = re.sub(r"[^A-Z0-9+ ]+", " ", commercial)
        commercial = re.sub(r"\s+", " ", commercial).strip()
        series_match = re.search(r"\b(?:MOTO\s+)?([GEC]\s*\d{1,3}[A-Z]*(?:\s*(?:PLUS|PLAY|POWER|PRO|5G|S|I))?|EDGE\s*\d{1,2}(?:\s*(?:PRO|PLUS|FUSION|NEO))?|ONE\s*(?:FUSION|HYPER|ACTION|VISION)?)\b", commercial)
        if series_match:
            core = series_match.group(1).strip()
            names.add(core)
            names.add(f"MOTO {core}")
            names.add(f"MOTOROLA {core}")
    return tuple(sorted(names))


def _lg_commercial_names(relative_path: Path) -> tuple[str, ...]:
    names: set[str] = set()
    path_str = " ".join(relative_path.parts).upper()
    for chassis, (canonical, codes) in LG_CHASSIS_MAP.items():
        if any(c in path_str for c in codes) or chassis in path_str:
            names.add(canonical)
            names.add(canonical.removeprefix("LG ").strip())
    k_match = re.search(r"\b(K\d{1,2}[A-Z]*(?:\s*(?:PLUS|POWER|MAX))?)\b", path_str)
    if k_match:
        k_core = k_match.group(1)
        names.add(k_core)
        names.add(f"LG {k_core}")
    return tuple(sorted(names))


def _generic_commercial_names(brand: str, relative_path: Path) -> tuple[str, ...]:
    generic_folders = {"pdf", "pcbe", "sources", "files", "schematics", "manuals", "documentos", brand.lower()}
    meaningful_parts = [part for part in reversed(relative_path.parts[:-1]) if part.lower() not in generic_folders]
    if not meaningful_parts:
        return ()
    model_folder = meaningful_parts[0].strip().upper()
    model_folder = re.sub(rf"^{re.escape(brand)}\s+", "", model_folder)
    return (model_folder, f"{brand} {model_folder}")


def aliases_from_pdf_path(relative_path: Path) -> tuple[DeviceAlias, ...]:
    brand = normalize_brand(relative_path.parts[0] if relative_path.parts else "")
    path_text = " ".join(relative_path.parts)
    aliases: tuple[str, ...] = ()
    codes: set[str] = set()

    if brand == "SAMSUNG":
        all_codes = {
            f"{match.group(0)[:2].upper()}-{match.group(1).upper()}"
            for match in SAMSUNG_CODE_PATTERN.finditer(path_text)
        }
        declared_codes = {
            f"{match.group(0)[:2].upper()}-{match.group(1).upper()}"
            for part in relative_path.parts if any(w in part.upper() for w in ("GALAXY", "SAMSUNG", "A0", "A1", "A2", "A3", "A5", "A7", "M1", "M2", "M3", "M5", "S1", "S2", "S9", "NOTE", "FOLD", "FLIP"))
            for match in SAMSUNG_CODE_PATTERN.finditer(part)
        }
        declared_families = {
            match.group(1)
            for code in (declared_codes or all_codes)
            if (match := re.fullmatch(r"((?:SM|GT)-[A-Z]?\d{3,5})[A-Z]{0,3}", code))
        }
        codes = {
            code for code in all_codes
            if not declared_families or any(code.startswith(family) for family in declared_families)
        } or all_codes
        aliases = _samsung_commercial_names(relative_path)
    elif brand == "MOTOROLA":
        codes = {match.group(1).upper() for match in MOTOROLA_CODE_PATTERN.finditer(path_text)}
        aliases = _motorola_commercial_names(relative_path)
    elif brand == "LG":
        path_upper = path_text.upper()
        for chassis, (canonical, chassis_codes) in LG_CHASSIS_MAP.items():
            if any(c in path_upper for c in chassis_codes):
                codes.update(chassis_codes)
        aliases = _lg_commercial_names(relative_path)
    elif brand in ("HUAWEI", "XIAOMI", "APPLE"):
        aliases = _generic_commercial_names(brand, relative_path)
        codes = {aliases[0]} if aliases else set()
    else:
        return ()

    results = []
    candidates = sorted(codes) if codes else [normalize_model(brand, a) for a in aliases]
    for code in candidates:
        canonical = normalize_model(brand, code)
        canon_set = {code, canonical}
        for c in sorted(canon_set):
            for alias in aliases:
                cleaned_alias = _clean_model_alias(brand, alias)
                if cleaned_alias and cleaned_alias != c:
                    results.append(DeviceAlias(
                        brand=brand,
                        canonical_model=c,
                        alias=cleaned_alias,
                        source_path=relative_path.as_posix(),
                    ))
    return tuple(results)


def catalog_pdf_aliases(library_root: Path, connection: "Connection[object]") -> int:
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
