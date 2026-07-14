from __future__ import annotations

import re
from dataclasses import dataclass


COMPONENT_PATTERN = re.compile(r"\b[A-Z]{1,3}\d{3,5}\b")
DEFAULT_CHUNK_TOKENS = 700
DEFAULT_OVERLAP_TOKENS = 100


@dataclass(frozen=True, slots=True)
class PageChunk:
    document_id: str
    page_number: int
    content: str
    token_count: int
    component_codes: tuple[str, ...]


def extract_component_codes(text: str) -> tuple[str, ...]:
    return tuple(sorted(set(COMPONENT_PATTERN.findall(text.upper()))))


def chunk_page(
    document_id: str,
    page_number: int,
    text: str,
    chunk_tokens: int = DEFAULT_CHUNK_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
) -> tuple[PageChunk, ...]:
    if chunk_tokens <= overlap_tokens:
        raise ValueError("chunk_tokens must be greater than overlap_tokens")

    words = text.split()
    if not words:
        return ()

    chunks: list[PageChunk] = []
    step = chunk_tokens - overlap_tokens
    for start in range(0, len(words), step):
        selected = words[start : start + chunk_tokens]
        if not selected:
            break
        content = " ".join(selected)
        chunks.append(
            PageChunk(
                document_id=document_id,
                page_number=page_number,
                content=content,
                token_count=len(selected),
                component_codes=extract_component_codes(content),
            )
        )
        if start + chunk_tokens >= len(words):
            break
    return tuple(chunks)
