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
    first_directory = relative_path.parts[0].strip() if len(relative_path.parts) > 1 else ""
    brand = normalize_brand(first_directory)

    samsung_matches = re.findall(
        r"(?<![A-Z0-9])SM[\s_-]*([A-Z]\d{3,4}[A-Z]{0,3})(?![A-Z0-9])",
        searchable,
    )
    motorola = re.search(r"\bXT\d{4,5}\b", searchable)
    if samsung_matches:
        # A parent directory often contains a family model (for example SM-A405F)
        # while the PDF filename contains the exact variant (SM-A405FN). Prefer the
        # most specific match so model-scoped pilots and retrieval do not miss it.
        model = f"SM-{max(samsung_matches, key=len)}"
    elif motorola:
        model = motorola.group(0)
    elif brand == "APPLE":
        model_match = re.search(r"\bIPHONE\s+(?:SE\s+)?\d{1,2}(?:\s+PRO)?(?:\s+MAX)?\b", searchable)
        model = model_match.group(0) if model_match else relative_path.stem
    else:
        model = relative_path.parent.name or relative_path.stem

    if any(term in searchable for term in ("ESQUEMATIC", "SCHEMATIC", "SCHEMA")):
        document_type = "SCHEMATIC"
    elif any(term in searchable for term in ("MANUAL DE SERVICIO", "SERVICE MANUAL")):
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


def iter_pdf_inventory(library_root: Path) -> Iterator[PdfInventoryEntry]:
    root = library_root.resolve(strict=True)
    for candidate in sorted(root.rglob("*.pdf")):
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
