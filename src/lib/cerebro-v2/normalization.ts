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

export type DeviceIdentity = {
    brand: string;
    model: string;
    modelFamily?: string;
};

const DECLARED_IDENTITIES: ReadonlyArray<{
    brand: string;
    model: string;
    modelFamily: string;
    aliases: readonly string[];
}> = [
    {
        brand: "SAMSUNG",
        model: "SM-A125M",
        modelFamily: "GALAXY A12",
        aliases: ["SM-A125M", "GALAXY A12", "A12"],
    },
];

export function normalizeBrand(value: string): string {
    const key = value.trim().toLowerCase();
    return BRAND_ALIASES[key] ?? key.toUpperCase();
}

export function normalizeModel(brand: string, value: string): string {
    const normalizedBrand = normalizeBrand(brand);
    const raw = value.trim().toUpperCase().replace(/[_\s-]+/g, " ");
    const clean = raw.startsWith(`${normalizedBrand} `)
        ? raw.slice(normalizedBrand.length + 1)
        : raw;
    const compact = clean.replaceAll(" ", "");
    const alias = MODEL_ALIASES[normalizedBrand]?.[compact];

    if (alias) return alias;
    const samsungCode = normalizedBrand === "SAMSUNG"
        ? compact.match(/^(SM|GT)([A-Z]\d{3,5}[A-Z]{0,3})$/)
        : null;
    if (samsungCode) return `${samsungCode[1]}-${samsungCode[2]}`;
    if (normalizedBrand === "SAMSUNG" && /^(?:(?:SM)?A125M|(?:GALAXY)?A12)$/.test(compact)) {
        return "SM-A125M";
    }
    if (normalizedBrand === "SAMSUNG" && /^(?:SM)?A405FN$/.test(compact)) {
        return "SM-A405FN";
    }
    if (normalizedBrand === "APPLE") {
        return clean.startsWith("IPHONE ") ? clean : `IPHONE ${clean}`;
    }

    return clean;
}

export function normalizeDeviceIdentity(brand: string, model: string): DeviceIdentity {
    const explicitModel = model.trim().toUpperCase();
    const resolvedBrand = /\bIPHONE\b/.test(explicitModel) ? "APPLE" : normalizeBrand(brand);
    const normalizedModel = normalizeModel(resolvedBrand, model);
    const declared = DECLARED_IDENTITIES.find((identity) => (
        identity.brand === resolvedBrand
        && identity.aliases.some((alias) => normalizeModel(resolvedBrand, alias) === normalizedModel)
    ));
    const identity: DeviceIdentity = {
        brand: resolvedBrand,
        model: declared?.model ?? normalizedModel,
    };
    if (declared) identity.modelFamily = declared.modelFamily;
    return identity;
}

export function deviceModelAliases(identity: DeviceIdentity): string[] {
    const declared = DECLARED_IDENTITIES.find((candidate) => (
        candidate.brand === identity.brand && candidate.model === identity.model
    ));
    if (declared) return [...declared.aliases];
    if (identity.brand === "APPLE" && identity.model.startsWith("IPHONE ")) {
        return [identity.model, identity.model.slice("IPHONE ".length)];
    }
    return [identity.model];
}
