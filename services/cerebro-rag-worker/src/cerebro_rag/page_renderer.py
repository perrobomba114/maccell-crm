from __future__ import annotations

from pathlib import Path


def resolve_cached_page(cache_root: Path, rendered_path: Path) -> Path:
    root = cache_root.resolve(strict=True)
    candidate = rendered_path.resolve(strict=True)
    try:
        candidate.relative_to(root)
    except ValueError as error:
        raise ValueError("rendered page escapes cache root") from error
    if not candidate.is_file() or candidate.suffix.casefold() not in {".png", ".webp"}:
        raise ValueError("rendered page is not a supported image")
    return candidate


def render_document_page(
    pdf_path: Path,
    document_hash: str,
    page_number: int,
    cache_root: Path,
) -> Path:
    if page_number < 1:
        raise ValueError("page number must be positive")
    from pdf2image import convert_from_path

    destination = cache_root / document_hash / f"page-{page_number:04d}.png"
    if destination.exists():
        return resolve_cached_page(cache_root, destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    images = convert_from_path(
        str(pdf_path),
        dpi=168,
        first_page=page_number,
        last_page=page_number,
        fmt="png",
        thread_count=1,
    )
    if not images:
        raise ValueError("page could not be rendered")
    images[0].save(destination, "PNG", optimize=True)
    return resolve_cached_page(cache_root, destination)
