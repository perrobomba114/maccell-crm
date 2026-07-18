import { getDailyRange, getMonthlyRange } from "@/lib/date-utils";
import {
    normalizeBillingEntity,
    type InvoiceEntitySummary,
    type InvoiceFiscalEntity,
} from "./invoice-summary-helpers";

export type VoucherType = 1 | 6 | 11;

export type AfipVoucherLookup = {
    entity: InvoiceFiscalEntity;
    salesPoint: number;
    voucherType: VoucherType;
    voucherNumber: number;
};

export type InvoiceForAfipSeed = {
    billingEntity: string | null;
    totalAmount: number;
    netAmount: number;
    vatAmount: number;
    invoiceType: string;
    invoiceNumber: string;
    createdAt: Date;
    sale: {
        branch: {
            name: string | null;
            code: string | null;
        } | null;
    } | null;
};

type AfipReadRangeAccumulator = {
    salesPoint: number;
    min: number;
    max: number;
};

export function resolveInvoiceDateRange(date?: string) {
    if (!date) return null;

    const range = date.length === 7
        ? getMonthlyRange(`${date}-01`)
        : getDailyRange(date);

    if (Number.isNaN(range.start.getTime()) || Number.isNaN(range.end.getTime())) {
        return null;
    }

    return range;
}

function invoiceTypeToVoucherType(invoiceType: string): VoucherType | null {
    const normalized = invoiceType.trim().toUpperCase();

    if (normalized === "A") return 1;
    if (normalized === "B") return 6;
    if (normalized === "C") return 11;

    return null;
}

function parseVoucherIdentity(invoiceNumber: string) {
    const parts = invoiceNumber.split("-");
    if (parts.length < 2) return null;

    const salesPoint = Number(parts[0]);
    const voucherNumber = Number(parts[1]);
    if (!Number.isInteger(salesPoint) || salesPoint <= 0 || !Number.isInteger(voucherNumber) || voucherNumber <= 0) {
        return null;
    }

    return { salesPoint, voucherNumber };
}

export function parseInvoiceVoucherIdentity(invoice: InvoiceForAfipSeed): AfipVoucherLookup | null {
    const entity = normalizeBillingEntity(invoice);
    const voucherType = invoiceTypeToVoucherType(invoice.invoiceType);
    const identity = parseVoucherIdentity(invoice.invoiceNumber);

    if (!voucherType || !identity) return null;

    return { entity, voucherType, ...identity };
}

function buildInvoiceLookupKey(invoice: InvoiceForAfipSeed) {
    const identity = parseInvoiceVoucherIdentity(invoice);
    return identity ? buildAfipLookupKey(identity) : null;
}

function buildAfipLookupKey(lookup: AfipVoucherLookup) {
    return `${lookup.entity}:${lookup.salesPoint}:${lookup.voucherType}:${lookup.voucherNumber}`;
}

export function filterInvoicesByAfipLookups(
    invoices: InvoiceForAfipSeed[],
    lookups: AfipVoucherLookup[]
) {
    const completedLookupKeys = new Set(lookups.map(buildAfipLookupKey));
    return invoices.filter((invoice) => {
        const lookupKey = buildInvoiceLookupKey(invoice);
        return lookupKey ? completedLookupKeys.has(lookupKey) : false;
    });
}

export function compareInvoiceLookups(local: AfipVoucherLookup[], afip: AfipVoucherLookup[]) {
    const localKeys = new Set(local.map(buildAfipLookupKey));
    const afipKeys = new Set(afip.map(buildAfipLookupKey));

    return {
        matched: local.filter((lookup) => afipKeys.has(buildAfipLookupKey(lookup))),
        onlyLocal: local.filter((lookup) => !afipKeys.has(buildAfipLookupKey(lookup))),
        onlyAfip: afip.filter((lookup) => !localKeys.has(buildAfipLookupKey(lookup))),
    };
}

export function buildAfipRanges(invoices: InvoiceForAfipSeed[]) {
    const rangesByEntityAndType = new Map<InvoiceFiscalEntity, Map<VoucherType, AfipReadRangeAccumulator>>([
        ["MACCELL", new Map()],
        ["8BIT", new Map()],
    ]);

    for (const invoice of invoices) {
        const entity = normalizeBillingEntity(invoice);
        const voucherType = invoiceTypeToVoucherType(invoice.invoiceType);
        const identity = parseVoucherIdentity(invoice.invoiceNumber);

        if (!voucherType || !identity) continue;

        const byType = rangesByEntityAndType.get(entity);
        if (!byType) continue;

        const currentRange = byType.get(voucherType);
        if (!currentRange) {
            byType.set(voucherType, { salesPoint: identity.salesPoint, min: identity.voucherNumber, max: identity.voucherNumber });
            continue;
        }

        if (currentRange.salesPoint !== identity.salesPoint) continue;

        byType.set(voucherType, {
            salesPoint: currentRange.salesPoint,
            min: Math.min(currentRange.min, identity.voucherNumber),
            max: Math.max(currentRange.max, identity.voucherNumber),
        });
    }

    return Array.from(rangesByEntityAndType.entries()).flatMap(([entity, byType]) =>
        Array.from(byType.entries())
            .filter(([, boundaries]) => boundaries.max >= boundaries.min)
            .map(([voucherType, boundaries]) => ({
                entity,
                salesPoint: boundaries.salesPoint,
                voucherType,
                minVoucherNumber: boundaries.min,
                maxVoucherNumber: boundaries.max,
            }))
    );
}

export function createEmptyAfipSummaries(): InvoiceEntitySummary[] {
    return [
        { entity: "MACCELL", label: "MACCELL - 3 locales", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] },
        { entity: "8BIT", label: "8 Bit Accesorios", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] },
    ];
}
