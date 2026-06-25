import { getAfipClient } from "@/lib/afip";
import {
    roundCurrency,
    type InvoiceEntitySummary,
    type InvoiceFiscalEntity,
} from "./invoice-summary-helpers";

type VoucherType = 1 | 6 | 11;

export type AfipVoucherReadRange = {
    entity: InvoiceFiscalEntity;
    salesPoint: number;
    voucherType: VoucherType;
    minVoucherNumber: number;
    maxVoucherNumber: number;
};

export type AfipReadResult = {
    summaries: InvoiceEntitySummary[];
    warnings: string[];
};

type AfipReadRangeOptions = {
    ranges: AfipVoucherReadRange[];
    startDate?: Date;
    endDate?: Date;
    maxScanPerRange?: number;
};

const MAX_SCAN_PER_RANGE_DEFAULT = 500;

function normalizeLookupKey(key: string) {
    return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function findValue(payload: unknown, keys: string[]): unknown | null {
    if (payload === null || payload === undefined) {
        return null;
    }

    const wanted = new Set(keys.map((key) => normalizeLookupKey(key)));

    if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
        return null;
    }

    if (Array.isArray(payload)) {
        for (const item of payload) {
            const value = findValue(item, keys);
            if (value !== null) {
                return value;
            }
        }
        return null;
    }

    const record = payload as Record<string, unknown>;
    for (const [rawKey, rawValue] of Object.entries(record)) {
        if (wanted.has(normalizeLookupKey(rawKey))) {
            return rawValue;
        }

        const nested = findValue(rawValue, keys);
        if (nested !== null) {
            return nested;
        }
    }

    return null;
}

function toNumber(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const parsed = Number(value.replace(/[^0-9.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function toDate(value: unknown): Date | null {
    if (typeof value === "number") {
        const text = String(value);
        if (text.length === 8) {
            const year = Number(text.slice(0, 4));
            const month = Number(text.slice(4, 6));
            const day = Number(text.slice(6, 8));
            if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                return new Date(year, month - 1, day);
            }
        }
        return null;
    }

    if (typeof value === "string") {
        const digits = value.replace(/[^0-9]/g, "");
        if (digits.length === 8) {
            const year = Number(digits.slice(0, 4));
            const month = Number(digits.slice(4, 6));
            const day = Number(digits.slice(6, 8));
            if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                return new Date(year, month - 1, day);
            }
        }
    }

    return null;
}

function isInRange(date: Date, start?: Date, end?: Date) {
    if (!start || !end) return true;
    const value = date.getTime();
    return value >= start.getTime() && value <= end.getTime();
}

function emptySummaries() {
    return new Map<InvoiceFiscalEntity, InvoiceEntitySummary>([
        ["MACCELL", {
            entity: "MACCELL",
            label: "MACCELL - 3 locales",
            count: 0,
            totalAmount: 0,
            totalNet: 0,
            totalVat: 0,
            branches: [],
        }],
        ["8BIT", {
            entity: "8BIT",
            label: "8 Bit Accesorios",
            count: 0,
            totalAmount: 0,
            totalNet: 0,
            totalVat: 0,
            branches: [],
        }],
    ]);
}

export async function getAfipVoucherReadSummaries({
    ranges,
    startDate,
    endDate,
    maxScanPerRange = MAX_SCAN_PER_RANGE_DEFAULT,
}: AfipReadRangeOptions): Promise<AfipReadResult> {
    if (!ranges.length) {
        return {
            summaries: [
                { entity: "MACCELL", label: "MACCELL - 3 locales", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] },
                { entity: "8BIT", label: "8 Bit Accesorios", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] },
            ],
            warnings: []
        };
    }

    const summaries = emptySummaries();
    const warnings: string[] = [];

    for (const range of ranges) {
        if (range.minVoucherNumber > range.maxVoucherNumber) {
            continue;
        }

        const scannedTotal = range.maxVoucherNumber - range.minVoucherNumber + 1;
        const effectiveStart = scannedTotal > maxScanPerRange
            ? Math.max(range.maxVoucherNumber - maxScanPerRange + 1, range.minVoucherNumber)
            : range.minVoucherNumber;

        if (scannedTotal > maxScanPerRange) {
            warnings.push(`Rango ACTIVO para ${range.entity} (${range.voucherType}) truncado a ${maxScanPerRange} comprobantes por rendimiento.`);
        }

        const service = await getAfipClient(undefined, range.entity);
        const svc = service.electronicBillingService as {
            getVoucherInfo?: (voucherNumber: number, salesPoint: number, voucherType: number) => Promise<unknown>;
        };

        if (typeof svc.getVoucherInfo !== "function") {
            return {
                summaries: Array.from(summaries.values()),
                warnings: [...warnings, "No se encontró getVoucherInfo en el cliente AFIP."],
            };
        }

        for (let voucherNumber = effectiveStart; voucherNumber <= range.maxVoucherNumber; voucherNumber += 1) {
            try {
                const response = await svc.getVoucherInfo(voucherNumber, range.salesPoint, range.voucherType);
                if (!response) continue;

                const cae = String(findValue(response, ["CAE", "cae"]) || "").trim();
                if (!cae || cae === "0") continue;

                const dateRaw = findValue(response, ["CbteFch", "cbteFch", "FchCbte", "fecha", "fechaComprobante"]);
                const voucherDate = toDate(dateRaw);
                if (voucherDate && !isInRange(voucherDate, startDate, endDate)) {
                    continue;
                }

                const total = toNumber(findValue(response, ["ImpTotal", "impTotal", "total"])) || 0;
                const net = toNumber(findValue(response, ["ImpNeto", "impNeto", "neto"])) || 0;
                const vat = toNumber(findValue(response, ["ImpIVA", "impIva", "iva", "IVA"])) || 0;

                const summary = summaries.get(range.entity);
                if (!summary) continue;

                summary.count += 1;
                summary.totalAmount = roundCurrency(summary.totalAmount + (total || net + vat));
                summary.totalNet = roundCurrency(summary.totalNet + net);
                summary.totalVat = roundCurrency(summary.totalVat + vat);
            } catch {
                continue;
            }
        }
    }

    return {
        summaries: Array.from(summaries.values()),
        warnings,
    };
}

