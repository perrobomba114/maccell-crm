from __future__ import annotations

import re


BRAND_ALIASES = {
    "apple": "APPLE",
    "iphone": "APPLE",
    "samsung": "SAMSUNG",
    "smsung": "SAMSUNG",
    "motorola": "MOTOROLA",
    "moto": "MOTOROLA",
    "xiaomi": "XIAOMI",
    "redmi": "XIAOMI",
    "huawei": "HUAWEI",
    "lg": "LG",
}

DECLARED_MODEL_ALIASES: dict[tuple[str, str], tuple[str, ...]] = {
    ("SAMSUNG", "SM-A125M"): ("SM-A125M", "GALAXY A12", "A12"),
}


def normalize_brand(value: str) -> str:
    key = value.strip().casefold()
    return BRAND_ALIASES.get(key, key.upper())


def normalize_model(brand: str, value: str) -> str:
    normalized_brand = normalize_brand(brand)
    clean = re.sub(r"[_\s-]+", " ", value.strip().upper())
    if clean.startswith(f"{normalized_brand} "):
        clean = clean[len(normalized_brand) + 1 :]
    compact = clean.replace(" ", "")
    samsung_code = re.fullmatch(r"(SM|GT)([A-Z]\d{3,5}[A-Z]{0,3})", compact) if normalized_brand == "SAMSUNG" else None
    if samsung_code:
        return f"{samsung_code.group(1)}-{samsung_code.group(2)}"
    if normalized_brand == "SAMSUNG" and re.fullmatch(r"(?:(?:SM)?A125M|(?:GALAXY)?A12)", compact):
        return "SM-A125M"
    if normalized_brand == "SAMSUNG" and re.fullmatch(r"(?:SM)?A405FN", compact):
        return "SM-A405FN"
    if normalized_brand == "APPLE" and compact == "11PM":
        return "IPHONE 11 PRO MAX"
    if normalized_brand == "APPLE":
        return clean if clean.startswith("IPHONE ") else f"IPHONE {clean}"
    return clean


def model_aliases(brand: str, model: str) -> tuple[str, ...]:
    normalized_brand = normalize_brand(brand)
    normalized_model = normalize_model(normalized_brand, model)
    return DECLARED_MODEL_ALIASES.get(
        (normalized_brand, normalized_model),
        (normalized_model,),
    )


def model_family(brand: str, model: str) -> str | None:
    aliases = model_aliases(brand, model)
    return aliases[1] if len(aliases) > 1 else None
