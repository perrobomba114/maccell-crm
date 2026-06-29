"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
    buildEntitySummaries,
    buildSystemAfipDiffSummary,
    type InvoiceSystemAfipDiffSummary,
} from "./invoice-summary-helpers";
import { getAfipVoucherReadSummaries } from "./afip-voucher-reader";
import {
    buildAfipRanges,
    createEmptyAfipSummaries,
    resolveInvoiceDateRange,
    type InvoiceForAfipSeed,
} from "./invoice-afip-control-helpers";

type InvoiceAfipControlResult = {
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
            branch: {
                select: {
                    name: true,
                    code: true,
                }
            }
        }
    }
} satisfies Prisma.SaleInvoiceSelect;

function emptyControlResult(error: string): InvoiceAfipControlResult {
    return {
        success: false,
        error,
        summaries: buildSystemAfipDiffSummary(createEmptyAfipSummaries(), createEmptyAfipSummaries()),
        warnings: [],
        readAt: new Date().toISOString(),
    };
}

export async function getInvoiceAfipControl(date?: string): Promise<InvoiceAfipControlResult> {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return emptyControlResult("No autorizado.");
    }

    const range = resolveInvoiceDateRange(date);
    if (!range) {
        return emptyControlResult("Seleccioná un mes o día para consultar ARCA.");
    }

    const systemInvoices = await db.saleInvoice.findMany({
        where: {
            cae: { not: "" },
            createdAt: {
                gte: range.start,
                lte: range.end,
            },
        },
        select: invoiceAfipSelect,
    });

    const systemSummaries = buildEntitySummaries(systemInvoices);
    const emptyDiff = buildSystemAfipDiffSummary(systemSummaries, createEmptyAfipSummaries());
    const ranges = buildAfipRanges(systemInvoices as InvoiceForAfipSeed[]);

    if (!ranges.length) {
        return {
            success: true,
            summaries: emptyDiff,
            warnings: ["No hay comprobantes locales con numeración válida para consultar."],
            readAt: new Date().toISOString(),
        };
    }

    try {
        const afipReadResult = await getAfipVoucherReadSummaries({
            ranges,
            startDate: range.start,
            endDate: range.end,
        });

        return {
            success: true,
            summaries: buildSystemAfipDiffSummary(systemSummaries, afipReadResult.summaries),
            warnings: afipReadResult.warnings,
            readAt: new Date().toISOString(),
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("AFIP invoice control error:", message);
        return {
            success: false,
            error: "No se pudo consultar ARCA en este momento.",
            summaries: emptyDiff,
            warnings: [],
            readAt: new Date().toISOString(),
        };
    }
}
