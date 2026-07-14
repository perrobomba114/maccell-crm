const BRAND_ALIASES: Readonly<Record<string, string>> = {
    apple: "APPLE",
    huawei: "HUAWEI",
    iphone: "APPLE",
    lg: "LG",
    moto: "MOTOROLA",
    motorola: "MOTOROLA",
    redmi: "XIAOMI",
    samsung: "SAMSUNG",
    smsung: "SAMSUNG",
    xiaomi: "XIAOMI",
};

const MODEL_ALIASES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    APPLE: {
        "11PM": "IPHONE 11 PRO MAX",
    },
};

export function normalizeBrand(value: string): string {
    const key = value.trim().toLowerCase();
    return BRAND_ALIASES[key] ?? key.toUpperCase();
}

export function normalizeModel(brand: string, value: string): string {
    const normalizedBrand = normalizeBrand(brand);
    const clean = value.trim().toUpperCase().replace(/[_\s-]+/g, " ");
    const compact = clean.replaceAll(" ", "");
    const alias = MODEL_ALIASES[normalizedBrand]?.[compact];

    if (alias) return alias;
    if (normalizedBrand === "SAMSUNG" && /^(?:SM)?A405FN$/.test(compact)) {
        return "SM-A405FN";
    }
    if (normalizedBrand === "APPLE") {
        return clean.startsWith("IPHONE ") ? clean : `IPHONE ${clean}`;
    }

    return clean;
}
