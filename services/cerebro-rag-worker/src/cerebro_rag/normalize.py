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

MOTOROLA_XT_MAP = {
    "G22": ("MOTO G22", ("XT2231", "XT2231-1", "XT2231-2", "XT2231-3", "XT2231-5")),
    "G13": ("MOTO G13", ("XT2335", "XT2335-1", "XT2335-2")),
    "G14": ("MOTO G14", ("XT2341", "XT2341-1", "XT2341-2", "XT2341-3")),
    "G23": ("MOTO G23", ("XT2333", "XT2333-1", "XT2333-3")),
    "G52": ("MOTO G52", ("XT2221", "XT2221-1", "XT2221-2")),
    "G53": ("MOTO G53", ("XT2335-2", "XT2335")),
    "G54": ("MOTO G54", ("XT2343", "XT2343-1", "XT2343-2")),
    "G84": ("MOTO G84", ("XT2347", "XT2347-1", "XT2347-2")),
    "G30": ("MOTO G30", ("XT2129", "XT2129-1", "XT2129-2")),
    "G31": ("MOTO G31", ("XT2173", "XT2173-1", "XT2173-2", "XT2173-3")),
    "G32": ("MOTO G32", ("XT2235", "XT2235-2", "XT2235-3")),
    "G41": ("MOTO G41", ("XT2167", "XT2167-1")),
    "G42": ("MOTO G42", ("XT2233", "XT2233-1", "XT2233-2")),
    "G20": ("MOTO G20", ("XT2128", "XT2128-1", "XT2128-2")),
    "G10": ("MOTO G10", ("XT2127", "XT2127-1", "XT2127-2")),
    "G100": ("MOTO G100", ("XT2125", "XT2125-4")),
    "G200": ("MOTO G200", ("XT2175", "XT2175-1")),
    "E22": ("MOTO E22", ("XT2239", "XT2239-1", "XT2239-2", "XT2239-3")),
    "E20": ("MOTO E20", ("XT2155", "XT2155-1", "XT2155-3")),
    "E13": ("MOTO E13", ("XT2345", "XT2345-3", "XT2345-4")),
    "E32": ("MOTO E32", ("XT2227", "XT2227-1", "XT2227-2", "XT2227-3")),
    "E40": ("MOTO E40", ("XT2159", "XT2159-1", "XT2159-2")),
    "EDGE30": ("MOTO EDGE 30", ("XT2203", "XT2203-1")),
    "EDGE40": ("MOTO EDGE 40", ("XT2303", "XT2303-1", "XT2303-2")),
    "ONEFUSION": ("MOTOROLA ONE FUSION", ("XT2073", "XT2073-2")),
    "ONEHYPER": ("MOTOROLA ONE HYPER", ("XT2027", "XT2027-1")),
    "ONEVISION": ("MOTOROLA ONE VISION", ("XT1970", "XT1970-1", "XT1970-3")),
    "ONEACTION": ("MOTOROLA ONE ACTION", ("XT2013", "XT2013-1", "XT2013-2")),
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

    if normalized_brand == "MOTOROLA":
        xt_match = re.match(r"^XT(\d{4,5})(?:-\d+)?$", compact)
        if xt_match:
            xt_base = f"XT{xt_match.group(1)}"
            for model_name, xt_list in MOTOROLA_XT_MAP.values():
                if any(xt.startswith(xt_base) for xt in xt_list):
                    return model_name
            return xt_base
        series_match = re.match(
            r"^(?:MOTO\s+)?([GEC]\s*\d{1,3}[A-Z]*(?:\s*(?:PLUS|PLAY|POWER|PRO|5G|S|I))?|EDGE\s*\d{1,2}(?:\s*(?:PRO|PLUS|FUSION|NEO))?|ONE\s*(?:FUSION|HYPER|ACTION|VISION)?)$",
            clean,
            re.IGNORECASE,
        )
        if series_match:
            core = re.sub(r"\s+", " ", series_match.group(1).upper())
            return f"MOTOROLA {core}" if core.startswith("ONE") else f"MOTO {core}"
        return clean

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
    if (normalized_brand, normalized_model) in DECLARED_MODEL_ALIASES:
        return DECLARED_MODEL_ALIASES[(normalized_brand, normalized_model)]

    # Preserve exact unregistered board variants without inferring cross-model aliases
    if normalized_brand == "SAMSUNG" and re.fullmatch(r"(?:SM|GT)-[A-Z]\d{3,5}[A-Z]+", normalized_model):
        return (normalized_model,)

    clean = re.sub(r"[_\s-]+", " ", normalized_model.strip().upper())
    compact = clean.replace(" ", "")

    if normalized_brand == "APPLE":
        if normalized_model.startswith("IPHONE "):
            return (normalized_model, normalized_model[len("IPHONE ") :])
        return (normalized_model,)

    if normalized_brand == "MOTOROLA":
        aliases = [clean, compact]
        series_match = re.match(
            r"^(?:MOTOROLA\s+)?(?:MOTO\s+)?([GEC]\s*\d{1,3}[A-Z]*(?:\s*(?:PLUS|PLAY|POWER|PRO|5G|S|I))?|EDGE\s*\d{1,2}(?:\s*(?:PRO|PLUS|FUSION|NEO))?|ONE\s*(?:FUSION|HYPER|ACTION|VISION)?)$",
            clean,
            re.IGNORECASE,
        )
        if series_match:
            core = re.sub(r"\s+", " ", series_match.group(1).upper())
            core_compact = core.replace(" ", "")
            aliases.extend([
                core,
                core_compact,
                f"MOTO {core}",
                f"MOTO {core_compact}",
                f"MOTOROLA {core}",
                f"MOTOROLA {core_compact}",
            ])
            if core_compact in MOTOROLA_XT_MAP:
                model_name, xt_list = MOTOROLA_XT_MAP[core_compact]
                aliases.append(model_name)
                aliases.extend(xt_list)
        return tuple(dict.fromkeys(aliases))

    if normalized_brand == "SAMSUNG":
        aliases = [clean, compact]
        a_match = re.fullmatch(r"(?:GALAXY|SAMSUNG)?A0?(\d{1,2})([SE]|CORE|5G)?", compact)
        if a_match:
            num = a_match.group(1)
            num_pad = f"0{num}" if len(num) == 1 else num
            variant = a_match.group(2) or ""
            is_s = variant == "S"
            is_5g = variant == "5G"
            base_name = f"A{num}{variant}"
            aliases.extend([
                base_name,
                f"GALAXY {base_name}",
                f"SAMSUNG {base_name}",
                f"A{num}",
                f"GALAXY A{num}",
            ])
            if is_s:
                aliases.extend([f"SM-A{num_pad}7", f"SM-A{num_pad}7M", f"SM-A{num_pad}7F"])
            elif is_5g:
                aliases.extend([f"SM-A{num_pad}6", f"SM-A{num_pad}6B", f"SM-A{num_pad}6E"])
            else:
                aliases.extend([
                    f"SM-A{num_pad}5",
                    f"SM-A{num_pad}5M",
                    f"SM-A{num_pad}5F",
                    f"SM-A{num_pad}6",
                    f"SM-A{num_pad}6B",
                    f"SM-A{num_pad}6E",
                ])
            aliases.append(f"SM-A{num_pad}")
        return tuple(dict.fromkeys(aliases))

    return (normalized_model,)


def model_family(brand: str, model: str) -> str | None:
    aliases = model_aliases(brand, model)
    return aliases[1] if len(aliases) > 1 else None
