import { db } from "@/lib/db";
import type { AdminInvoiceTotals, ValidAdminInvoiceInput } from "@/lib/admin-invoice-validation";
import type { InvoiceFiscalEntity } from "@/actions/invoice-summary-helpers";
import type { PaymentMethod, Prisma } from "@prisma/client";

export type AuthorizedInvoiceData = {
    cae: string;
    voucherNumber: string;
    caeExpiresAt: Date;
};

type EmissionContext = {
    requestedById: string;
    billingEntity: InvoiceFiscalEntity;
    salesPoint: number;
    input: ValidAdminInvoiceInput;
    totals: AdminInvoiceTotals;
};

export async function createEmissionAttempt(context: EmissionContext) {
    const existing = await db.fiscalEmissionAttempt.findUnique({ where: { id: context.input.requestId } });
    if (existing) return { attempt: existing, created: false };

    try {
        const attempt = await db.fiscalEmissionAttempt.create({
            data: {
                id: context.input.requestId,
                requestedById: context.requestedById,
                branchId: context.input.branchId,
                billingEntity: context.billingEntity,
                salesPoint: context.salesPoint,
                invoiceType: context.input.invoiceType,
                payload: context.input as Prisma.InputJsonObject,
                status: "PENDING",
            },
        });
        return { attempt, created: true };
    } catch (error: unknown) {
        const concurrentAttempt = await db.fiscalEmissionAttempt.findUnique({
            where: { id: context.input.requestId },
        });
        if (concurrentAttempt) return { attempt: concurrentAttempt, created: false };
        throw error;
    }
}

export async function storeAuthorizedAttempt(requestId: string, authorization: AuthorizedInvoiceData) {
    return db.fiscalEmissionAttempt.update({
        where: { id: requestId },
        data: {
            status: "AUTHORIZED_PENDING_SYNC",
            cae: authorization.cae,
            voucherNumber: authorization.voucherNumber,
            caeExpiresAt: authorization.caeExpiresAt,
            error: null,
        },
    });
}

export async function markEmissionAttemptFailed(requestId: string, error: string) {
    return db.fiscalEmissionAttempt.update({
        where: { id: requestId },
        data: { status: "FAILED", error },
    });
}

export async function persistAuthorizedAdminInvoice(
    context: EmissionContext,
    authorization: AuthorizedInvoiceData
) {
    const paymentMethod = context.input.paymentMethod as PaymentMethod;
    return db.$transaction(async (tx) => {
        const currentAttempt = await tx.fiscalEmissionAttempt.findUniqueOrThrow({
            where: { id: context.input.requestId },
        });

        if (currentAttempt.status === "COMPLETED" && currentAttempt.saleId) {
            return { saleId: currentAttempt.saleId, ...authorization, alreadyCompleted: true };
        }

        const sale = await tx.sale.create({
            data: {
                saleNumber: `ADM-${context.input.requestId}`,
                total: context.totals.total,
                vendorId: context.requestedById,
                branchId: context.input.branchId,
                paymentMethod,
                items: {
                    create: context.input.items.map((item) => ({
                        name: item.description,
                        quantity: item.quantity,
                        price: item.unitPrice,
                    })),
                },
                payments: {
                    create: { method: paymentMethod, amount: context.totals.total },
                },
                invoice: {
                    create: {
                        invoiceType: context.input.invoiceType,
                        invoiceNumber: authorization.voucherNumber,
                        cae: authorization.cae,
                        caeExpiresAt: authorization.caeExpiresAt,
                        customerDocType: context.input.customer.docType,
                        customerDoc: context.input.customer.docNumber,
                        customerName: context.input.customer.name,
                        customerAddress: context.input.customer.address,
                        netAmount: context.totals.net,
                        vatAmount: context.totals.vat,
                        totalAmount: context.totals.total,
                        billingEntity: context.billingEntity,
                    },
                },
            },
        });

        await tx.fiscalEmissionAttempt.update({
            where: { id: context.input.requestId },
            data: { status: "COMPLETED", saleId: sale.id, error: null },
        });

        return { saleId: sale.id, ...authorization, alreadyCompleted: false };
    });
}
