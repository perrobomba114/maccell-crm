function normalizeLookupKey(key: string) {
    return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function findValue(payload: unknown, keys: string[]): unknown | null {
    if (payload === null || payload === undefined) return null;
    if (["string", "number", "boolean"].includes(typeof payload)) return null;

    if (Array.isArray(payload)) {
        for (const item of payload) {
            const value = findValue(item, keys);
            if (value !== null) return value;
        }
        return null;
    }

    const wanted = new Set(keys.map(normalizeLookupKey));
    for (const [rawKey, rawValue] of Object.entries(payload as Record<string, unknown>)) {
        if (wanted.has(normalizeLookupKey(rawKey))) return rawValue;

        const nested = findValue(rawValue, keys);
        if (nested !== null) return nested;
    }

    return null;
}

function toNumber(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;

    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: unknown): Date | null {
    if (typeof value !== "number" && typeof value !== "string") return null;

    const digits = String(value).replace(/[^0-9]/g, "");
    if (digits.length !== 8) return null;

    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    if (![year, month, day].every(Number.isFinite)) return null;

    return new Date(year, month - 1, day);
}

export function parseAfipVoucherSummary(payload: unknown) {
    const authorizationCode = String(
        findValue(payload, ["CodAutorizacion", "codAutorizacion", "CAE", "cae"]) || ""
    ).trim();

    if (!authorizationCode || authorizationCode === "0") return null;

    return {
        authorizationCode,
        voucherDate: toDate(findValue(payload, ["CbteFch", "cbteFch", "FchCbte", "fecha", "fechaComprobante"])),
        total: toNumber(findValue(payload, ["ImpTotal", "impTotal", "total"])) || 0,
        net: toNumber(findValue(payload, ["ImpNeto", "impNeto", "neto"])) || 0,
        vat: toNumber(findValue(payload, ["ImpIVA", "impIva", "iva", "IVA"])) || 0,
    };
}
