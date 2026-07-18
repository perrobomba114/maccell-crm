import type { InvoiceEntitySummary, InvoiceFiscalEntity } from "./invoice-summary-helpers";
import type { AfipVoucherLookup, VoucherType } from "./invoice-afip-control-helpers";
import { parseAfipVoucherSummary } from "./afip-voucher-response";

export type AfipVoucherPeriodService = {
    getLastVoucher: (salesPoint: number, voucherType: number) => Promise<{ cbteNro?: number }>;
    getVoucherInfo: (voucherNumber: number, salesPoint: number, voucherType: number) => Promise<unknown>;
};

type ReadAfipVoucherPeriodOptions = {
    service: AfipVoucherPeriodService;
    entity: InvoiceFiscalEntity;
    salesPoint: number;
    voucherType: VoucherType;
    startDate: Date;
    endDate: Date;
    concurrency?: number;
    lookupTimeoutMs?: number;
};

export type AfipVoucherPeriodResult = {
    complete: boolean;
    summary: InvoiceEntitySummary;
    queriedVouchers: AfipVoucherLookup[];
    failedVoucherNumbers: number[];
};

type ParsedVoucher = NonNullable<ReturnType<typeof parseAfipVoucherSummary>>;

function roundCurrency(value: number) {
    return Math.round(value * 100) / 100;
}

function createSummary(entity: InvoiceFiscalEntity): InvoiceEntitySummary {
    return {
        entity,
        label: entity === "8BIT" ? "8 Bit Accesorios" : "MACCELL - 3 locales",
        count: 0,
        totalAmount: 0,
        totalNet: 0,
        totalVat: 0,
        branches: [],
    };
}

function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("ARCA lookup timeout")), timeoutMs);
        promise.then(
            (value) => {
                clearTimeout(timeout);
                resolve(value);
            },
            (error: unknown) => {
                clearTimeout(timeout);
                reject(error);
            }
        );
    });
}

export async function readAfipVoucherPeriod({
    service,
    entity,
    salesPoint,
    voucherType,
    startDate,
    endDate,
    concurrency = 6,
    lookupTimeoutMs = 5000,
}: ReadAfipVoucherPeriodOptions): Promise<AfipVoucherPeriodResult> {
    const summary = createSummary(entity);
    const lastResult = await withTimeout(
        service.getLastVoucher(salesPoint, voucherType),
        lookupTimeoutMs
    );
    const lastVoucherNumber = lastResult.cbteNro ?? 0;

    if (lastVoucherNumber <= 0) {
        return { complete: true, summary, queriedVouchers: [], failedVoucherNumbers: [] };
    }

    const cache = new Map<number, ParsedVoucher | null>();
    const failed = new Set<number>();

    async function getParsedVoucher(voucherNumber: number) {
        if (cache.has(voucherNumber)) return cache.get(voucherNumber) ?? null;

        try {
            const response = await withTimeout(
                service.getVoucherInfo(voucherNumber, salesPoint, voucherType),
                lookupTimeoutMs
            );
            const parsed = response ? parseAfipVoucherSummary(response) : null;
            cache.set(voucherNumber, parsed);
            if (!parsed?.voucherDate) failed.add(voucherNumber);
            return parsed;
        } catch {
            failed.add(voucherNumber);
            cache.set(voucherNumber, null);
            return null;
        }
    }

    async function findFirstAtOrAfter(target: Date) {
        let low = 1;
        let high = lastVoucherNumber;
        let answer = lastVoucherNumber + 1;

        while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            const voucher = await getParsedVoucher(middle);
            if (!voucher?.voucherDate) {
                return null;
            }

            if (voucher.voucherDate.getTime() >= target.getTime()) {
                answer = middle;
                high = middle - 1;
            } else {
                low = middle + 1;
            }
        }

        return answer;
    }

    const firstVoucherNumber = await findFirstAtOrAfter(startDate);
    const firstAfterPeriod = await findFirstAtOrAfter(new Date(endDate.getTime() + 1));
    if (firstVoucherNumber === null || firstAfterPeriod === null) {
        return {
            complete: false,
            summary,
            queriedVouchers: [],
            failedVoucherNumbers: Array.from(failed).sort((a, b) => a - b),
        };
    }

    const lastVoucherInPeriod = Math.min(firstAfterPeriod - 1, lastVoucherNumber);
    if (firstVoucherNumber > lastVoucherInPeriod) {
        return {
            complete: failed.size === 0,
            summary,
            queriedVouchers: [],
            failedVoucherNumbers: Array.from(failed).sort((a, b) => a - b),
        };
    }

    const voucherNumbers = Array.from(
        { length: lastVoucherInPeriod - firstVoucherNumber + 1 },
        (_, index) => firstVoucherNumber + index
    );
    const queriedVouchers: AfipVoucherLookup[] = [];

    for (const batch of chunkArray(voucherNumbers, Math.max(1, concurrency))) {
        const values = await Promise.all(batch.map((voucherNumber) => getParsedVoucher(voucherNumber)));
        values.forEach((voucher, index) => {
            if (!voucher?.voucherDate) return;
            if (voucher.voucherDate < startDate || voucher.voucherDate > endDate) return;

            summary.count += 1;
            summary.totalAmount = roundCurrency(summary.totalAmount + (voucher.total || voucher.net + voucher.vat));
            summary.totalNet = roundCurrency(summary.totalNet + voucher.net);
            summary.totalVat = roundCurrency(summary.totalVat + voucher.vat);
            queriedVouchers.push({ entity, salesPoint, voucherType, voucherNumber: batch[index] });
        });
    }

    return {
        complete: failed.size === 0,
        summary,
        queriedVouchers,
        failedVoucherNumbers: Array.from(failed).sort((a, b) => a - b),
    };
}
