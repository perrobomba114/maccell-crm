"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { createAfipInvoice, getAfipClient, getTaxpayerDetails } from "@/lib/afip";
import { getIvaConditionId } from "@/lib/afip-utils";
import { recoverAuthorizedVoucher } from "@/lib/afip-voucher-recovery";
import {
    resolveAdminFiscalContext,
    validateAndCalculateAdminInvoice,
    type AdminInvoiceInput,
} from "@/lib/admin-invoice-validation";
import {
    createEmissionAttempt,
    markEmissionAttemptFailed,
    persistAuthorizedAdminInvoice,
    storeAuthorizedAttempt,
    type AuthorizedInvoiceData,
} from "./admin-invoice-persistence";
import { revalidatePath } from "next/cache";

async function getAdminCaller() {
    const user = await getCurrentUser();
    return user && user.role === "ADMIN" ? user : null;
}

export async function searchCuit(cuit: number) {
    const caller = await getAdminCaller();
    if (!caller) return { success: false, error: "No autorizado." };
    if (!Number.isInteger(cuit) || String(cuit).length !== 11) {
        return { success: false, error: "Ingresá un CUIT válido de 11 dígitos." };
    }
    return getTaxpayerDetails(cuit);
}

function parseCaeExpiration(value: string) {
    if (!/^\d{8}$/.test(value)) throw new Error("ARCA no devolvió un vencimiento de CAE válido.");
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month - 1, day, 12));
}

export async function generateAdminInvoice(input: AdminInvoiceInput) {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") {
        return { success: false, error: "No autorizado." };
    }

    const validation = validateAndCalculateAdminInvoice(input);
    if (!validation.success) return validation;

    const branch = await db.branch.findUniqueOrThrow({
        where: { id: validation.data.branchId },
        select: { id: true, name: true, code: true },
    });
    const fiscalContext = resolveAdminFiscalContext(branch);
    const context = {
        requestedById: caller.id,
        billingEntity: fiscalContext.billingEntity,
        salesPoint: fiscalContext.salesPoint,
        input: validation.data,
        totals: validation.totals,
    };
    const attemptResult = await createEmissionAttempt(context);
    const attempt = attemptResult.attempt;

    if (attempt.requestedById !== caller.id) {
        return { success: false, error: "El identificador de emisión pertenece a otra operación." };
    }

    if (attempt.status === "COMPLETED" && attempt.cae && attempt.voucherNumber && attempt.caeExpiresAt) {
        return {
            success: true,
            invoice: {
                cae: attempt.cae,
                voucherNumber: attempt.voucherNumber,
                caeExpiresAt: attempt.caeExpiresAt.toISOString(),
                syncStatus: "COMPLETED" as const,
            },
        };
    }

    let authorization: AuthorizedInvoiceData;
    if (attempt.status === "AUTHORIZED_PENDING_SYNC" && attempt.cae && attempt.voucherNumber && attempt.caeExpiresAt) {
        authorization = {
            cae: attempt.cae,
            voucherNumber: attempt.voucherNumber,
            caeExpiresAt: attempt.caeExpiresAt,
        };
    } else if (attempt.status !== "PENDING" || !attemptResult.created) {
        return { success: false, error: "La emisión anterior no puede repetirse automáticamente. Revisá su estado en ARCA." };
    } else {
        const docNumber = Number(validation.data.customer.docNumber.replace(/\D/g, "")) || 0;
        const docType = validation.data.customer.docType === "CUIT"
            ? 80
            : validation.data.customer.docType === "DNI" ? 96 : 99;
        const voucherType = validation.data.invoiceType === "A" ? 1 : 6;
        const afipResult = await createAfipInvoice({
            salesPoint: fiscalContext.salesPoint,
            type: voucherType,
            concept: validation.data.concept,
            docType,
            docNumber,
            cbteDesde: 0,
            cbteHasta: 0,
            amount: validation.totals.total,
            vatAmount: validation.totals.vat,
            netAmount: validation.totals.net,
            exemptAmount: 0,
            ivaItems: [{ id: 5, base: validation.totals.net, amount: validation.totals.vat }],
            serviceDateFrom: validation.data.serviceDateFrom,
            serviceDateTo: validation.data.serviceDateTo,
            paymentDueDate: validation.data.paymentDueDate,
            ivaConditionId: getIvaConditionId(validation.data.customer.ivaCondition),
            branchId: branch.id,
            billingEntity: fiscalContext.billingEntity,
        });

        if (!afipResult.success || !afipResult.data) {
            const error = afipResult.error || "ARCA rechazó la emisión.";
            await markEmissionAttemptFailed(validation.data.requestId, error);
            return { success: false, error };
        }

        let voucherNumber = afipResult.data.voucherNumber;
        let caeExpiration = afipResult.data.caeFchVto;
        if (!voucherNumber || !caeExpiration) {
            const client = await getAfipClient(branch.id, fiscalContext.billingEntity);
            const recovered = await recoverAuthorizedVoucher(
                client.electronicBillingService,
                fiscalContext.salesPoint,
                voucherType,
                afipResult.data.cae
            );
            voucherNumber = recovered.voucherNumber;
            caeExpiration = recovered.caeExpiresAt;
        }

        authorization = {
            cae: afipResult.data.cae,
            voucherNumber: `${String(fiscalContext.salesPoint).padStart(5, "0")}-${String(voucherNumber).padStart(8, "0")}`,
            caeExpiresAt: parseCaeExpiration(caeExpiration),
        };
        await storeAuthorizedAttempt(validation.data.requestId, authorization);
    }

    try {
        const persisted = await persistAuthorizedAdminInvoice(context, authorization);
        revalidatePath("/admin/invoices");
        return {
            success: true,
            invoice: {
                cae: persisted.cae,
                voucherNumber: persisted.voucherNumber,
                caeExpiresAt: persisted.caeExpiresAt.toISOString(),
                syncStatus: "COMPLETED" as const,
            },
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Admin invoice local synchronization failed:", message);
        return {
            success: false,
            error: "ARCA autorizó la factura, pero quedó pendiente de sincronización local. No vuelvas a emitirla.",
            syncStatus: "AUTHORIZED_PENDING_SYNC" as const,
        };
    }
}
