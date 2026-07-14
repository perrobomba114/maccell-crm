from __future__ import annotations

import subprocess
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Callable, Protocol

from pypdf.errors import PdfReadError


NATIVE_TEXT_THRESHOLD = 40


def sanitize_extracted_text(text: str) -> str:
    """Remove NUL bytes that PostgreSQL cannot store in text columns."""
    return text.replace("\x00", "")


class NativeTextPage(Protocol):
    def extract_text(self) -> str | None: ...


PopplerExtractor = Callable[[Path, int], str]


def extract_page_with_poppler(pdf_path: Path, page_number: int) -> str:
    try:
        result = subprocess.run(
            [
                "pdftotext",
                "-f",
                str(page_number),
                "-l",
                str(page_number),
                "-layout",
                str(pdf_path),
                "-",
            ],
            capture_output=True,
            check=False,
            encoding="utf-8",
            errors="replace",
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return result.stdout if result.returncode == 0 else ""


def extract_native_page_text(
    page: NativeTextPage,
    pdf_path: Path,
    page_number: int,
    poppler_extract: PopplerExtractor = extract_page_with_poppler,
) -> str:
    try:
        text = page.extract_text() or ""
    except PdfReadError:
        text = poppler_extract(pdf_path, page_number)
    return sanitize_extracted_text(text).strip()


class ExtractionMethod(StrEnum):
    NATIVE = "NATIVE"
    OCR = "OCR"
    NONE = "NONE"


@dataclass(frozen=True, slots=True)
class ExtractedPage:
    page_number: int
    text: str
    method: ExtractionMethod
    rendered_path: Path | None


def choose_extraction_method(native_text: str) -> ExtractionMethod:
    if len(native_text.strip()) > NATIVE_TEXT_THRESHOLD:
        return ExtractionMethod.NATIVE
    return ExtractionMethod.OCR


def render_during_ingestion(method: ExtractionMethod) -> bool:
    return method is ExtractionMethod.OCR


def extract_pdf_pages(pdf_path: Path, document_hash: str, cache_root: Path) -> tuple[ExtractedPage, ...]:
    from pypdf import PdfReader

    document_cache = cache_root / document_hash
    document_cache.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(pdf_path))
    extracted: list[ExtractedPage] = []

    for index, page in enumerate(reader.pages, start=1):
        native_text = extract_native_page_text(page, pdf_path, index)
        method = choose_extraction_method(native_text)
        if not render_during_ingestion(method):
            extracted.append(ExtractedPage(index, native_text, method, None))
            continue
        from pdf2image import convert_from_path
        import pytesseract

        rendered_path = document_cache / f"page-{index:04d}.png"
        images = convert_from_path(
            str(pdf_path),
            dpi=144,
            first_page=index,
            last_page=index,
            fmt="png",
            thread_count=1,
        )
        if not images:
            extracted.append(ExtractedPage(index, native_text, ExtractionMethod.NONE, None))
            continue
        image = images[0]
        image.save(rendered_path, "PNG")
        text = sanitize_extracted_text(pytesseract.image_to_string(image, lang="eng+spa"))
        extracted.append(ExtractedPage(index, text.strip(), method, rendered_path))

    return tuple(extracted)
