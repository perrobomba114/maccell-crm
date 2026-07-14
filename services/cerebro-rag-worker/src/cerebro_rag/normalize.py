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


def normalize_brand(value: str) -> str:
    key = value.strip().casefold()
    return BRAND_ALIASES.get(key, key.upper())


def normalize_model(brand: str, value: str) -> str:
    normalized_brand = normalize_brand(brand)
    clean = re.sub(r"[_\s-]+", " ", value.strip().upper())
    compact = clean.replace(" ", "")
    if normalized_brand == "SAMSUNG" and re.fullmatch(r"(?:SM)?A405FN", compact):
        return "SM-A405FN"
    if normalized_brand == "APPLE" and compact == "11PM":
        return "IPHONE 11 PRO MAX"
    return clean
