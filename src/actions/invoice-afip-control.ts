"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import type { AfipReconciliation, AfipReconciliationStatus, Prisma } from "@prisma/client";
import { getAfipClient } from "@/lib/afip";
import {
    buildEntitySummaries,
    buildSystemAfipDiffSummary,
    roundCurrency,
    type InvoiceFiscalEntity,
    type InvoiceSystemAfipDiffSummary,
} from "./invoice-summary-helpers";
import {
    compareInvoiceLookups,
    createEmptyAfipSummaries,
    parseInvoiceVoucherIdentity,
    resolveInvoiceDateRange,
    type AfipVoucherLookup,
    type InvoiceForAfipSeed,
    type VoucherType,
} from "./invoice-afip-control-helpers";
import { readAfipVoucherPeriod, type AfipVoucherPeriodResult } from "./afip-voucher-period-reader";

export type InvoiceAfipControlResult = {
    success: boolean;
    summaries: InvoiceSystemAfipDiffSummary[];
    warnings: string[];
    readAt: string;
    error?: string;
};

const invoiceAfipSelect = {
    id: true,
    billingEntity: true,
    totalAmount: true,
    netAmount: true,
    vatAmount: true,
    invoiceType: true,
    invoiceNumber: true,
    createdAt: true,
    sale: {
        select: {
            branch: { select: { name: true, code: true } },
        },
    },
} satisfies Prisma.SaleInvoiceSelect;

const FISCAL_CONFIG: Record<InvoiceFiscalEntity, { salesPoint: number; voucherTypes: VoucherType[] }> = {
    MACCELL: { salesPoint: 10, voucherTypes: [1, 6, 11] },
    "8BIT": { salesPoint: 3, voucherTypes: [1, 6, 11] },
};

function emptyControlResult(error: string): InvoiceAfipControlResult {
    return {
        success: false,
        error,
        summaries: buildSystemAfipDiffSummary(createEmptyAfipSummaries(), createEmptyAfipSummaries()),
        warnings: [],
        readAt: new Date().toISOString(),
    };
}

async function requireAdmin() {
    const user = await getCurrentUser();
    return user?.role === "ADMIN" ? user : null;
}

async function getPeriodInvoices(start: Date, end: Date) {
    return db.saleInvoice.findMany({
        where: { cae: { not: "" }, createdAt: { gte: start, lte: end } },
        select: invoiceAfipSelect,
    });
}

function withStoredStatus(
    summary: InvoiceSystemAfipDiffSummary,
    status: AfipReconciliationStatus,
    onlyLocalCount: number,
    onlyAfipCount: number
): InvoiceSystemAfipDiffSummary {
    return { ...summary, status, onlyLocalCount, onlyAfipCount };
}

export async function getStoredInvoiceAfipControl(date?: string): Promise<InvoiceAfipControlResult> {
    if (!await requireAdmin()) return emptyControlResult("No autorizado.");

    const range = resolveInvoiceDateRange(date);
    if (!range || !date) return emptyControlResult("Seleccioná un mes o día para consultar ARCA.");

    let rows: AfipReconciliation[];
    try {
        rows = await db.afipReconciliation.findMany({ where: { period: date } });
    } catch {
        return {
            success: true,
            summaries: [],
            warnings: ["El historial de conciliación estará disponible después de sincronizar el esquema."],
            readAt: new Date().toISOString(),
        };
    }
    if (!rows.length) {
        return {
            success: true,
            summaries: [],
            warnings: [],
            readAt: new Date().toISOString(),
        };
    }

    const summaries = rows.map((row): InvoiceSystemAfipDiffSummary => {
        const discrepancies = row.discrepancies as { onlyLocalCount?: number; onlyAfipCount?: number } | null;
        return {
            entity: row.entity === "8BIT" ? "8BIT" : "MACCELL",
            label: row.entity === "8BIT" ? "8 Bit Accesorios" : "MACCELL",
            systemAmount: row.localTotal,
            afipAmount: row.afipTotal,
            differenceAmount: row.differenceAmount,
            systemCount: row.localCount,
            afipCount: row.afipCount,
            status: row.status,
            onlyLocalCount: discrepancies?.onlyLocalCount ?? 0,
            onlyAfipCount: discrepancies?.onlyAfipCount ?? 0,
        };
    });

    return {
        success: true,
        summaries,
        warnings: rows.flatMap((row) => Array.isArray(row.warnings) ? row.warnings.filter((item): item is string => typeof item === "string") : []),
        readAt: rows.reduce((latest, row) => row.updatedAt > latest ? row.updatedAt : latest, rows[0].updatedAt).toISOString(),
    };
}

async function readEntityPeriod(
    entity: InvoiceFiscalEntity,
    startDate: Date,
    endDate: Date
): Promise<AfipVoucherPeriodResult[]> {
    const client = await getAfipClient(undefined, entity);
    const service = client.electronicBillingService;
    const config = FISCAL_CONFIG[entity];

    const results: AfipVoucherPeriodResult[] = [];
    for (const voucherType of config.voucherTypes) {
        results.push(await readAfipVoucherPeriod({
            service,
            entity,
            salesPoint: config.salesPoint,
            voucherType,
            startDate,
            endDate,
        }));
    }
    return results;
}

export async function getInvoiceAfipControl(date?: string): Promise<InvoiceAfipControlResult> {
    if (!await requireAdmin()) return emptyControlResult("No autorizado.");

    const range = resolveInvoiceDateRange(date);
    if (!range || !date) return emptyControlResult("Seleccioná un mes o día para consultar ARCA.");

    const systemInvoices = await getPeriodInvoices(range.start, range.end);
    const systemSummaries = buildEntitySummaries(systemInvoices);
    const localLookups = systemInvoices
        .map((invoice) => parseInvoiceVoucherIdentity(invoice as InvoiceForAfipSeed))
        .filter((lookup): lookup is AfipVoucherLookup => lookup !== null);

    await Promise.all((["MACCELL", "8BIT"] as const).map((entity) => db.afipReconciliation.upsert({
        where: { period_entity: { period: date, entity } },
        create: { period: date, entity, status: "RUNNING", startedAt: new Date() },
        update: { status: "RUNNING", startedAt: new Date(), completedAt: null, warnings: [] },
    })));

    try {
        const entityResults = await Promise.all((["MACCELL", "8BIT"] as const).map(async (entity) => ({
            entity,
            ranges: await readEntityPeriod(entity, range.start, range.end),
        })));
        const summaries: InvoiceSystemAfipDiffSummary[] = [];
        const warnings: string[] = [];

        for (const { entity, ranges } of entityResults) {
            const systemSummary = systemSummaries.find((item) => item.entity === entity);
            if (!systemSummary) continue;

            const afipSummary = createEmptyAfipSummaries().find((item) => item.entity === entity);
            if (!afipSummary) continue;

            for (const rangeResult of ranges) {
                afipSummary.count += rangeResult.summary.count;
                afipSummary.totalAmount = roundCurrency(afipSummary.totalAmount + rangeResult.summary.totalAmount);
                afipSummary.totalNet = roundCurrency(afipSummary.totalNet + rangeResult.summary.totalNet);
                afipSummary.totalVat = roundCurrency(afipSummary.totalVat + rangeResult.summary.totalVat);
                if (!rangeResult.complete) {
                    warnings.push(`${entity}: ${rangeResult.failedVoucherNumbers.length} consultas no se completaron.`);
                }
            }

            const afipLookups = ranges.flatMap((item) => item.queriedVouchers);
            const entityLocalLookups = localLookups.filter((lookup) => lookup.entity === entity);
            const comparison = compareInvoiceLookups(entityLocalLookups, afipLookups);
            const isComplete = ranges.every((item) => item.complete);
            const status: AfipReconciliationStatus = isComplete ? "COMPLETE" : "INCOMPLETE";
            const baseDiff = buildSystemAfipDiffSummary([systemSummary], [afipSummary])[0];
            const summary = withStoredStatus(baseDiff, status, comparison.onlyLocal.length, comparison.onlyAfip.length);
            summaries.push(summary);

            await db.afipReconciliation.update({
                where: { period_entity: { period: date, entity } },
                data: {
                    status,
                    localCount: summary.systemCount,
                    afipCount: summary.afipCount,
                    localTotal: summary.systemAmount,
                    afipTotal: summary.afipAmount,
                    differenceAmount: summary.differenceAmount,
                    discrepancies: {
                        onlyLocalCount: comparison.onlyLocal.length,
                        onlyAfipCount: comparison.onlyAfip.length,
                        onlyLocal: comparison.onlyLocal,
                        onlyAfip: comparison.onlyAfip,
                    },
                    warnings: warnings.filter((warning) => warning.startsWith(`${entity}:`)),
                    completedAt: new Date(),
                },
            });
        }

        return { success: true, summaries, warnings, readAt: new Date().toISOString() };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("AFIP invoice control error:", message);
        await db.afipReconciliation.updateMany({
            where: { period: date, status: "RUNNING" },
            data: { status: "FAILED", warnings: ["No se pudo completar la lectura de ARCA."], completedAt: new Date() },
        });
        return emptyControlResult("No se pudo consultar ARCA en este momento.");
    }
}
