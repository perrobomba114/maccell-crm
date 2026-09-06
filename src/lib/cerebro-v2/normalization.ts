import {
    huaweiAliases,
    lgAliases,
    LG_CHASSIS_MAP,
    motorolaAliases,
    MOTOROLA_XT_MAP,
    samsungSeriesAliases,
    xiaomiAliases,
} from "./device-aliases";

const BRAND_ALIASES: Readonly<Record<string, string>> = {
    apple: "APPLE",
    blackshark: "XIAOMI",
    honor: "HUAWEI",
    huawei: "HUAWEI",
    iphone: "APPLE",
    "iphone(free)": "APPLE",
    "iphone(vip)": "APPLE",
    lg: "LG",
    moto: "MOTOROLA",
    motorola: "MOTOROLA",
    "motorola(vip)": "MOTOROLA",
    poco: "XIAOMI",
    redmi: "XIAOMI",
    samsung: "SAMSUNG",
    smsung: "SAMSUNG",
    xiaomi: "XIAOMI",
};

const MODEL_ALIASES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    APPLE: {
        "11PM": "IPHONE 11 PRO MAX",
        "12PM": "IPHONE 12 PRO MAX",
        "13PM": "IPHONE 13 PRO MAX",
        "13P": "IPHONE 13 PRO",
        "13PRO": "IPHONE 13 PRO",
        "IPHONE13PRO": "IPHONE 13 PRO",
        "IPHONE13PROMAX": "IPHONE 13 PRO MAX",
        "14PM": "IPHONE 14 PRO MAX",
        "15PM": "IPHONE 15 PRO MAX",
        "16PM": "IPHONE 16 PRO MAX",
        "17PM": "IPHONE 17 PRO MAX",
        "17PROMAX": "IPHONE 17 PRO MAX",
        "IPHONE17PROMAX": "IPHONE 17 PRO MAX",
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
        model: "SM-A037M",
        modelFamily: "GALAXY A03S",
        aliases: ["SM-A037M", "SM-A037", "A037", "A03S", "GALAXY A03S", "SM-A037F"],
    },
    {
        brand: "SAMSUNG",
        model: "SM-A125M",
        modelFamily: "GALAXY A12",
        aliases: ["SM-A125M", "GALAXY A12", "A12"],
    },
    {
        brand: "APPLE",
        model: "IPHONE 13 PRO MAX",
        modelFamily: "IPHONE 13 SERIES",
        aliases: ["IPHONE 13 PRO MAX", "13 PRO MAX", "13PM", "IPHONE13PROMAX"],
    },
    {
        brand: "APPLE",
        model: "IPHONE 13 PRO",
        modelFamily: "IPHONE 13 SERIES",
        aliases: ["IPHONE 13 PRO", "13 PRO", "13P", "13PRO", "IPHONE13PRO"],
    },
    {
        brand: "APPLE",
        model: "IPHONE 17 PRO MAX",
        modelFamily: "IPHONE 17 SERIES",
        aliases: ["IPHONE 17 PRO MAX", "17 PRO MAX", "17PM", "IPHONE17PROMAX", "17PROMAX"],
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

    if (normalizedBrand === "APPLE") {
        const appleMatch = compact.match(/^(?:IPHONE)?(\d{1,2}|X|XR|XS|SE(?:\d)?)(PROMAX|PRO_PROMAX|PRO|PLUS|MINI|MAX)?$/);
        if (appleMatch) {
            const num = appleMatch[1];
            let suffix = appleMatch[2] ?? "";
            if (suffix === "PRO_PROMAX" || suffix === "PROMAX") suffix = "PRO MAX";
            return `IPHONE ${num}${suffix ? ` ${suffix}` : ""}`.trim();
        }
        return clean.startsWith("IPHONE ") ? clean : `IPHONE ${clean}`;
    }

    if (normalizedBrand === "MOTOROLA") {
        const xtMatch = compact.match(/^XT(\d{4,5})(?:-\d+)?$/);
        if (xtMatch) {
            const xtBase = `XT${xtMatch[1]}`;
            for (const [, entry] of Object.entries(MOTOROLA_XT_MAP)) {
                if (entry.xtList.some(xt => xt.startsWith(xtBase))) {
                    return entry.model;
                }
            }
            return `XT${xtMatch[1]}`;
        }
        const seriesMatch = clean.match(/^(?:MOTO\s+)?([GEC]\s*\d{1,3}[A-Z]*(?:\s*(?:PLUS|PLAY|POWER|PRO|5G|S|I))?|EDGE\s*\d{1,2}(?:\s*(?:PRO|PLUS|FUSION|NEO))?|ONE\s*(?:FUSION|HYPER|ACTION|VISION)?)$/i);
        if (seriesMatch) {
            const modelCore = seriesMatch[1].toUpperCase().replace(/\s+/g, " ");
            return modelCore.startsWith("ONE") ? `MOTOROLA ${modelCore}` : `MOTO ${modelCore}`;
        }
        return clean;
    }

    if (normalizedBrand === "LG") {
        for (const entry of Object.values(LG_CHASSIS_MAP)) {
            if (entry.codes.some(c => compact.startsWith(c))) {
                return entry.model;
            }
        }
        return clean.startsWith("LG ") ? clean : `LG ${clean}`;
    }

    if (normalizedBrand === "SAMSUNG") {
        const samsungCode = compact.match(/^(SM|GT)-?([A-Z]\d{3,5}[A-Z]{0,3})$/);
        if (samsungCode) return `${samsungCode[1]}-${samsungCode[2]}`;
        if (/^(?:(?:SM)?A037[A-Z]?|(?:GALAXY)?A03S)$/.test(compact)) return "SM-A037M";
        if (/^(?:(?:SM)?A125M|(?:GALAXY)?A12)$/.test(compact)) return "SM-A125M";
        if (/^(?:SM)?A405FN$/.test(compact)) return "SM-A405FN";
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
    if (declared) {
        identity.modelFamily = declared.modelFamily;
    } else if (resolvedBrand === "MOTOROLA" && normalizedModel.startsWith("MOTO ")) {
        identity.modelFamily = normalizedModel;
    } else if (resolvedBrand === "SAMSUNG" && /^(?:GALAXY\s+)?A\d{1,2}/.test(normalizedModel)) {
        identity.modelFamily = normalizedModel.startsWith("GALAXY ") ? normalizedModel : `GALAXY ${normalizedModel}`;
    } else if (resolvedBrand === "LG" && normalizedModel.startsWith("LG ")) {
        identity.modelFamily = normalizedModel;
    } else if (resolvedBrand === "HUAWEI") {
        identity.modelFamily = normalizedModel;
    } else if (resolvedBrand === "XIAOMI") {
        identity.modelFamily = normalizedModel;
    }
    return identity;
}

export function deviceModelAliases(identity: DeviceIdentity): string[] {
    const declared = DECLARED_IDENTITIES.find((candidate) => (
        candidate.brand === identity.brand && candidate.model === identity.model
    ));
    if (declared) return [...declared.aliases];

    // Preserve exact unregistered board variants without inferring cross-model aliases
    if (identity.brand === "SAMSUNG" && /^(?:SM|GT)-[A-Z]\d{3,5}[A-Z]+$/.test(identity.model)) {
        return [identity.model];
    }

    const clean = identity.model.trim().toUpperCase().replace(/[_\s-]+/g, " ");
    const compact = clean.replace(/\s+/g, "");

    if (identity.brand === "APPLE") {
        if (identity.model.startsWith("IPHONE ")) {
            return [identity.model, identity.model.slice("IPHONE ".length)];
        }
        return [identity.model];
    }

    if (identity.brand === "MOTOROLA") {
        return motorolaAliases(clean, compact);
    }

    if (identity.brand === "SAMSUNG") {
        return samsungSeriesAliases(clean, compact);
    }

    if (identity.brand === "LG") {
        return lgAliases(clean, compact);
    }

    if (identity.brand === "HUAWEI") {
        return huaweiAliases(clean, compact);
    }

    if (identity.brand === "XIAOMI") {
        return xiaomiAliases(clean, compact);
    }

    return [identity.model];
}
