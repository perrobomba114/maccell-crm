from __future__ import annotations

import re


BRAND_ALIASES = {
    "apple": "APPLE",
    "iphone": "APPLE",
    "iphone(vip)": "APPLE",
    "iphone(free)": "APPLE",
    "samsung": "SAMSUNG",
    "smsung": "SAMSUNG",
    "motorola": "MOTOROLA",
    "motorola(vip)": "MOTOROLA",
    "moto": "MOTOROLA",
    "xiaomi": "XIAOMI",
    "redmi": "XIAOMI",
    "huawei": "HUAWEI",
    "lg": "LG",
}

DECLARED_MODEL_ALIASES: dict[tuple[str, str], tuple[str, ...]] = {
    ("SAMSUNG", "SM-A037M"): ("SM-A037M", "SM-A037", "A037", "A03S", "GALAXY A03S", "SM-A037F"),
    ("SAMSUNG", "SM-A037"): ("SM-A037", "SM-A037M", "A037", "A03S", "GALAXY A03S", "SM-A037F"),
    ("SAMSUNG", "SM-A125M"): ("SM-A125M", "GALAXY A12", "A12"),
    ("APPLE", "IPHONE 11 PRO MAX"): ("IPHONE 11 PRO MAX", "11 PRO MAX", "11PM"),
    ("APPLE", "IPHONE 12 PRO MAX"): ("IPHONE 12 PRO MAX", "12 PRO MAX", "12PM"),
    ("APPLE", "IPHONE 13 PRO MAX"): ("IPHONE 13 PRO MAX", "13 PRO MAX", "13PM", "IPHONE13PROMAX"),
    ("APPLE", "IPHONE 13 PRO"): ("IPHONE 13 PRO", "13 PRO", "13P", "13PRO", "IPHONE13PRO"),
    ("APPLE", "IPHONE 14 PRO MAX"): ("IPHONE 14 PRO MAX", "14 PRO MAX", "14PM"),
    ("APPLE", "IPHONE 15 PRO MAX"): ("IPHONE 15 PRO MAX", "15 PRO MAX", "15PM"),
    ("APPLE", "IPHONE 17 PRO MAX"): ("IPHONE 17 PRO MAX", "17 PRO MAX", "17PM", "IPHONE17PROMAX", "17PROMAX"),
}

IPHONE_PM_MAP = {
    "11PM": "IPHONE 11 PRO MAX",
    "12PM": "IPHONE 12 PRO MAX",
    "13PM": "IPHONE 13 PRO MAX",
    "14PM": "IPHONE 14 PRO MAX",
    "15PM": "IPHONE 15 PRO MAX",
    "16PM": "IPHONE 16 PRO MAX",
    "17PM": "IPHONE 17 PRO MAX",
}


def normalize_brand(value: str) -> str:
    key = value.strip().casefold()
    if key in BRAND_ALIASES:
        return BRAND_ALIASES[key]
    if "iphone" in key or "apple" in key:
        return "APPLE"
    if "samsung" in key:
        return "SAMSUNG"
    if "motorola" in key or "moto" in key:
        return "MOTOROLA"
    if "xiaomi" in key or "redmi" in key:
        return "XIAOMI"
    if "huawei" in key:
        return "HUAWEI"
    if "lg" in key:
        return "LG"
    return key.upper()


def normalize_model(brand: str, value: str) -> str:
    normalized_brand = normalize_brand(brand)
    clean = re.sub(r"[_\s-]+", " ", value.strip().upper())
    if clean.startswith(f"{normalized_brand} "):
        clean = clean[len(normalized_brand) + 1 :]
    compact = clean.replace(" ", "")

    if normalized_brand == "APPLE":
        if compact in IPHONE_PM_MAP:
            return IPHONE_PM_MAP[compact]
        # Match compact patterns like IPHONE13PROMAX, IPHONE13PRO, IPHONE13MINI
        apple_match = re.match(r"^(?:IPHONE)?(\d{1,2}|SE(?:\d)?)(PROMAX|PRO_PROMAX|PRO|PLUS|MINI)?$", compact)
        if apple_match:
            num, suffix = apple_match.groups()
            if suffix in ("PROMAX", "PRO_PROMAX"):
                suffix_clean = " PRO MAX"
            elif suffix:
                suffix_clean = f" {suffix}"
            else:
                suffix_clean = ""
            return f"IPHONE {num}{suffix_clean}".strip()
        clean = re.sub(r"\bPROMAX\b", "PRO MAX", clean)
        return clean if clean.startswith("IPHONE ") else f"IPHONE {clean}"

    samsung_code = re.search(r"(SM|GT)([A-Z]\d{3,5}[A-Z]{0,3})", compact) if normalized_brand == "SAMSUNG" else None
    if samsung_code:
        return f"{samsung_code.group(1)}-{samsung_code.group(2)}"
    if normalized_brand == "SAMSUNG" and re.fullmatch(r"(?:(?:SM)?A037[A-Z]?|(?:GALAXY)?A03S)", compact):
        return "SM-A037M"
    if normalized_brand == "SAMSUNG" and re.fullmatch(r"(?:(?:SM)?A125M|(?:GALAXY)?A12)", compact):
        return "SM-A125M"
    if normalized_brand == "SAMSUNG" and re.fullmatch(r"(?:SM)?A405FN", compact):
        return "SM-A405FN"
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
