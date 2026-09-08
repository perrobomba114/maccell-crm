from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from cerebro_rag.normalize import normalize_brand, normalize_model


@dataclass(frozen=True, slots=True)
class PdfIdentity:
    brand: str
    model: str
    document_type: str
    title: str


@dataclass(frozen=True, slots=True)
class PdfInventoryEntry:
    absolute_path: Path
    relative_path: Path
    sha256: str
    identity: PdfIdentity


def _searchable(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    return "".join(char for char in decomposed if not unicodedata.combining(char)).upper()


def parse_pdf_identity(relative_path: Path) -> PdfIdentity:
    path_text = " ".join(relative_path.parts)
    searchable = _searchable(path_text)

    # Determine brand by path contents and keywords
    samsung_pattern = r"(?<![A-Z0-9])((?:SM|GT)[\s_-]*[A-Z]?\d{3,5}[A-Z]{0,3})(?![A-Z0-9])"
    filename_matches = re.findall(samsung_pattern, _searchable(relative_path.name))
    samsung_matches = filename_matches or re.findall(samsung_pattern, searchable)
    motorola = re.search(r"\bXT\d{4,5}\b", searchable)

    if any(term in searchable for term in ("IPHONE", "IPAD", "IPOD", "MACBOOK", "APPLE")):
        brand = "APPLE"
    elif "SAMSUNG" in searchable or samsung_matches:
        brand = "SAMSUNG"
    elif "MOTOROLA" in searchable or "MOTO" in searchable or motorola:
        brand = "MOTOROLA"
    elif "XIAOMI" in searchable or "REDMI" in searchable:
        brand = "XIAOMI"
    elif "HUAWEI" in searchable or "HONOR" in searchable:
        brand = "HUAWEI"
    elif "LG" in searchable:
        brand = "LG"
    else:
        first_directory = relative_path.parts[0].strip() if len(relative_path.parts) > 1 else ""
        brand = normalize_brand(first_directory) if first_directory.lower() != "pdf" else "UNKNOWN"

    # The mount can include pdf/<brand>/<model> and legacy brand/<model>/Pdf.
    # Resolve folder identity before falling back to phone-specific filenames.
    brands = {name: name for name in (
        "NINTENDO", "XBOX", "PLAYSTATION", "SONY", "SEGA", "VALVE", "GOOGLE", "ASUS", "ACER",
        "LENOVO", "DELL", "HP", "MSI", "INFINIX", "TECNO", "ITEL", "MEIZU", "MICROSOFT",
        "OPPO", "VIVO", "REALME", "ONEPLUS", "NOKIA", "ZTE",
    )}
    for folder in relative_path.parts[:-1]:
        label = re.sub(r"\s*\((?:VIP|FREE|OFFICIAL|PREMIUM|CHINA|GLOBAL)\)", "", _searchable(folder)).strip()
        if label == "SONY PLAYSTATION":
            brand = "PLAYSTATION"
            break
        if label in brands:
            brand = brands[label]
            break

    if samsung_matches and brand == "SAMSUNG":
        model = re.sub(r"[\s_-]+", "-", max(samsung_matches, key=len))
    elif motorola:
        model = motorola.group(0)
    elif brand == "APPLE" and "IPHONE" in searchable:
        model_match = re.search(r"\bIPHONE\s*(?:SE\s*)?\d{1,2}(?:\s*(?:PRO\s*MAX|PRO|PLUS|MINI))?\b", searchable)
        if model_match:
            model = model_match.group(0)
        else:
            # Check parent folder names for iPhone model
            parent_match = None
            for part in reversed(relative_path.parts[:-1]):
                m = re.search(r"\bIPHONE\s*(?:SE\s*)?\d{1,2}(?:\s*(?:PRO\s*MAX|PRO|PLUS|MINI))?\b", _searchable(part))
                if m:
                    parent_match = m.group(0)
                    break
            model = parent_match or relative_path.stem
    else:
        generic_folders = {"pdf", "pcbe", "sources", "files", "schematics", "manuals", "documentos", "schematic and boardview", "repair case", "repair cases", "diode value", "block diagram", "pcb layer", "images", "image", "sch", "sony playstation", brand.lower()}
        folders = [re.sub(r"\s*\((?:vip|free|official|premium|china|global)\)", "", part, flags=re.IGNORECASE).strip() for part in relative_path.parts[:-1]]
        meaningful_parts = [part for part in reversed(folders) if part.lower() not in generic_folders]
        model = meaningful_parts[0] if meaningful_parts else relative_path.stem

    if any(term in searchable for term in ("REPAIR CASE", "FAULT", "FAILURE", "COMMON PROBLEMS", "FLYING WIRE", "FLY LINE")):
        document_type = "REPAIR_CASE"
    elif any(term in searchable for term in ("DIODE VALUE", "DIODE", "RESISTANCE DIAGRAM", "MIDDLE LEVEL DIODE")):
        document_type = "DIODE_VALUE"
    elif any(term in searchable for term in ("ESQUEMATIC", "SCHEMATIC", "SCHEMA", "BOARDVIEW", "PCB LAYER", "BLOCK DIAGRAM", "LINEAS DE", "LINEAS", "CIRCUITO", "BACKLIGHT", "TOUCH")):
        document_type = "SCHEMATIC"
    elif any(term in searchable for term in ("MANUAL DE SERVICIO", "SERVICE MANUAL", "TROUBLESHOOTING")):
        document_type = "SERVICE_MANUAL"
    else:
        document_type = "TECHNICAL_DOCUMENT"

    return PdfIdentity(
        brand=brand,
        model=normalize_model(brand, model),
        document_type=document_type,
        title=relative_path.stem,
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def published_pdf_paths(library_root: Path) -> list[Path]:
    root = library_root.resolve(strict=True)
    return sorted(candidate for candidate in root.rglob("*")
        if candidate.suffix.casefold() == ".pdf" and candidate.is_file() and not candidate.is_symlink()
        and not any(part.startswith(".") or part.casefold() == "backups" for part in candidate.relative_to(root).parts))


def iter_pdf_inventory(
    library_root: Path,
    shard_index: int = 0,
    shard_count: int = 1,
) -> Iterator[PdfInventoryEntry]:
    if shard_count < 1 or shard_index < 0 or shard_index >= shard_count:
        raise ValueError("invalid inventory shard")
    root = library_root.resolve(strict=True)
    pdf_candidates = published_pdf_paths(root)
    for position, candidate in enumerate(pdf_candidates):
        if position % shard_count != shard_index:
            continue
        resolved = candidate.resolve(strict=True)
        try:
            relative_path = resolved.relative_to(root)
        except ValueError:
            continue
        if candidate.is_symlink() or not resolved.is_file():
            continue
        yield PdfInventoryEntry(
            absolute_path=resolved,
            relative_path=relative_path,
            sha256=sha256_file(resolved),
            identity=parse_pdf_identity(relative_path),
        )
