import { getDailyRange, getMonthlyRange } from "@/lib/date-utils";
import {
    normalizeBillingEntity,
    type InvoiceEntitySummary,
    type InvoiceFiscalEntity,
} from "./invoice-summary-helpers";

type VoucherType = 1 | 6 | 11;

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
    min: number;
    max: number;
};

const ENTITY_SALES_POINT: Record<InvoiceFiscalEntity, number> = {
    MACCELL: 10,
    "8BIT": 3,
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

function parseVoucherNumber(invoiceNumber: string) {
    const parts = invoiceNumber.split("-");
    if (parts.length < 2) return null;

    const parsed = Number(parts[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export function buildAfipRanges(invoices: InvoiceForAfipSeed[]) {
    const rangesByEntityAndType = new Map<InvoiceFiscalEntity, Map<VoucherType, AfipReadRangeAccumulator>>([
        ["MACCELL", new Map()],
        ["8BIT", new Map()],
    ]);

    for (const invoice of invoices) {
        const entity = normalizeBillingEntity(invoice);
        const voucherType = invoiceTypeToVoucherType(invoice.invoiceType);
        const voucherNumber = parseVoucherNumber(invoice.invoiceNumber);

        if (!voucherType || !voucherNumber) continue;

        const byType = rangesByEntityAndType.get(entity);
        if (!byType) continue;

        const currentRange = byType.get(voucherType);
        if (!currentRange) {
            byType.set(voucherType, { min: voucherNumber, max: voucherNumber });
            continue;
        }

        byType.set(voucherType, {
            min: Math.min(currentRange.min, voucherNumber),
            max: Math.max(currentRange.max, voucherNumber),
        });
    }

    return Array.from(rangesByEntityAndType.entries()).flatMap(([entity, byType]) =>
        Array.from(byType.entries())
            .filter(([, boundaries]) => boundaries.max >= boundaries.min)
            .map(([voucherType, boundaries]) => ({
                entity,
                salesPoint: ENTITY_SALES_POINT[entity],
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
