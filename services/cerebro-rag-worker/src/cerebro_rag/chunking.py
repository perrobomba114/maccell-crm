from __future__ import annotations

import re
from dataclasses import dataclass


COMPONENT_PATTERN = re.compile(r"\b[A-Z]{1,3}\d{3,5}\b")
DEFAULT_CHUNK_TOKENS = 700
DEFAULT_OVERLAP_TOKENS = 100
DEFAULT_EMBEDDING_WORDS = 448


@dataclass(frozen=True, slots=True)
class PageChunk:
    document_id: str
    page_number: int
    content: str
    token_count: int
    component_codes: tuple[str, ...]


def extract_component_codes(text: str) -> tuple[str, ...]:
    return tuple(sorted(set(COMPONENT_PATTERN.findall(text.upper()))))


def embedding_projection(
    context: str,
    content: str,
    component_codes: tuple[str, ...],
    max_words: int = DEFAULT_EMBEDDING_WORDS,
) -> str:
    if max_words < 1:
        raise ValueError("max_words must be positive")

    context_words = context.split()[:48]
    code_words = list(component_codes[:64])
    prefix = (context_words + (["COMPONENTS"] if code_words else []) + code_words)[:max_words]
    remaining = max_words - len(prefix)
    content_words = content.split()
    if len(content_words) <= remaining:
        return " ".join(prefix + content_words)
    if remaining <= 1:
        return " ".join(prefix + content_words[:remaining])

    tail_size = min(96, max(1, remaining // 4))
    head_size = remaining - tail_size
    return " ".join(prefix + content_words[:head_size] + content_words[-tail_size:])


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
