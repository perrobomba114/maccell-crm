import { getAfipClient } from "@/lib/afip";
import {
    roundCurrency,
    type InvoiceEntitySummary,
    type InvoiceFiscalEntity,
} from "./invoice-summary-helpers";
import type { AfipVoucherLookup } from "./invoice-afip-control-helpers";
import { parseAfipVoucherSummary } from "./afip-voucher-response";

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
    queriedVouchers: AfipVoucherLookup[];
};

type AfipReadRangeOptions = {
    ranges: AfipVoucherReadRange[];
    startDate?: Date;
    endDate?: Date;
    maxScanPerRange?: number;
};

const MAX_SCAN_PER_RANGE_DEFAULT = 120;
const MAX_PARALLEL_REQUESTS = 4;
const LOOKUP_TIMEOUT_MS = 2500;
const LOOKUP_BUDGET_MS = 12000;
const CLIENT_INIT_TIMEOUT_MS = 1500;

function isInRange(date: Date, start?: Date, end?: Date) {
    if (!start || !end) return true;
    const value = date.getTime();
    return value >= start.getTime() && value <= end.getTime();
}

function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("AFIP lookup timeout"));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timeout);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

async function readVoucherSummary(
    svc: {
        getVoucherInfo?: (voucherNumber: number, salesPoint: number, voucherType: number) => Promise<unknown>;
    },
    range: AfipVoucherReadRange,
    voucherNumber: number,
    startDate?: Date,
    endDate?: Date
) {
    if (!svc.getVoucherInfo) return null;

    const response = await withTimeout(
        svc.getVoucherInfo(voucherNumber, range.salesPoint, range.voucherType),
        LOOKUP_TIMEOUT_MS
    );
    if (!response) return null;

    const summary = parseAfipVoucherSummary(response);
    if (!summary) return null;
    if (summary.voucherDate && !isInRange(summary.voucherDate, startDate, endDate)) {
        return null;
    }

    return summary;
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
            warnings: [],
            queriedVouchers: [],
        };
    }

    const summaries = emptySummaries();
    const warnings: string[] = [];
    const queriedVouchers: AfipVoucherLookup[] = [];
    const startedAt = Date.now();
    const clientsByEntity = new Map<InvoiceFiscalEntity, {
        getVoucherInfo?: (voucherNumber: number, salesPoint: number, voucherType: number) => Promise<unknown>;
    }>();

    for (const range of ranges) {
        if (range.minVoucherNumber > range.maxVoucherNumber) {
            continue;
        }

        const scannedTotal = range.maxVoucherNumber - range.minVoucherNumber + 1;
        const effectiveStart = scannedTotal > maxScanPerRange
            ? Math.max(range.maxVoucherNumber - maxScanPerRange + 1, range.minVoucherNumber)
            : range.minVoucherNumber;

        if (scannedTotal > maxScanPerRange) {
            warnings.push(`Comparación parcial para ${range.entity} (${range.voucherType}): se consultaron los últimos ${maxScanPerRange} números de comprobante.`);
        }

        let svc = clientsByEntity.get(range.entity);
        if (!svc) {
            try {
                const service = await withTimeout(
                    getAfipClient(undefined, range.entity),
                    CLIENT_INIT_TIMEOUT_MS
                );
                svc = service.electronicBillingService as {
                    getVoucherInfo?: (voucherNumber: number, salesPoint: number, voucherType: number) => Promise<unknown>;
                };
                clientsByEntity.set(range.entity, svc);
            } catch (error: unknown) {
                const reason = error instanceof Error ? error.message : String(error);
                warnings.push(`No se pudo inicializar cliente AFIP para ${range.entity}: ${reason}`);
                continue;
            }
        }

        if (typeof svc.getVoucherInfo !== "function") {
            warnings.push(`No se encontró getVoucherInfo en el cliente AFIP para ${range.entity}.`);
            continue;
        }

        const voucherNumbers = [];
        let failedLookups = 0;
        for (let voucherNumber = range.maxVoucherNumber; voucherNumber >= effectiveStart; voucherNumber -= 1) {
            voucherNumbers.push(voucherNumber);
        }

        for (const batch of chunkArray(voucherNumbers, MAX_PARALLEL_REQUESTS)) {
            if (Date.now() - startedAt > LOOKUP_BUDGET_MS) {
                if (failedLookups > 0) {
                    warnings.push(`${range.entity}: ${failedLookups} consultas no completadas quedaron fuera de la comparación.`);
                }
                warnings.push("Tiempo de lectura AFIP excedido. Se deja en valores parciales.");
                return {
                    summaries: Array.from(summaries.values()),
                    warnings,
                    queriedVouchers,
                };
            }

            const batchResults = await Promise.allSettled(
                batch.map((voucherNumber) => readVoucherSummary(svc, range, voucherNumber, startDate, endDate))
            );

            let shouldStop = false;

            for (const [resultIndex, result] of batchResults.entries()) {
                if (result.status !== "fulfilled") {
                    failedLookups += 1;
                    continue;
                }

                queriedVouchers.push({
                    entity: range.entity,
                    salesPoint: range.salesPoint,
                    voucherType: range.voucherType,
                    voucherNumber: batch[resultIndex],
                });

                if (!result.value) continue;

                const summary = summaries.get(range.entity);
                if (!summary) continue;

                summary.count += 1;
                summary.totalAmount = roundCurrency(summary.totalAmount + (result.value.total || result.value.net + result.value.vat));
                summary.totalNet = roundCurrency(summary.totalNet + result.value.net);
                summary.totalVat = roundCurrency(summary.totalVat + result.value.vat);

                if (startDate && result.value.voucherDate && result.value.voucherDate.getTime() < startDate.getTime()) {
                    shouldStop = true;
                    break;
                }
            }

            if (shouldStop) {
                warnings.push(`Lectura AFIP de ${range.entity} detenida por rango temporal anterior al solicitado.`);
                break;
            }
        }

        if (failedLookups > 0) {
            warnings.push(`${range.entity}: ${failedLookups} consultas no completadas quedaron fuera de la comparación.`);
        }
    }

    return {
        summaries: Array.from(summaries.values()),
        warnings,
        queriedVouchers,
    };
}
