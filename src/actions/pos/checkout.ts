"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";
import { generateAfipInvoiceForSale } from "./checkout-afip";
import { saveSaleTransaction } from "./checkout-db";
import { sendPostSaleNotifications } from "./checkout-notifications";
import { normalizeFiscalEntityFromBranch } from "../invoice-summary-helpers";

export async function processPosSale(data: {
    vendorId: string;
    branchId: string;
    items: {
        type: "PRODUCT" | "REPAIR";
        id: string; // Product ID or Repair ID
        quantity: number;
        price: number;
        name: string;
        originalPrice?: number;
        priceChangeReason?: string;
    }[];
    total: number;
    paymentMethod?: "CASH" | "CARD" | "MERCADOPAGO" | "SPLIT";
    payments?: {
        method: "CASH" | "CARD" | "MERCADOPAGO" | "SPLIT";
        amount: number;
    }[];
    invoiceData?: {
        generate: boolean;
        salesPoint: number;
        invoiceType: "A" | "B";
        docType: "CUIT" | "DNI" | "FINAL";
        docNumber: string;
        customerName: string;
        customerAddress?: string;
        concept?: number; // 1: Products, 2: Services
        serviceDateFrom?: string;
        serviceDateTo?: string;
        paymentDueDate?: string;
        ivaCondition?: string;
    };
}) {
    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "No autorizado" };
    
    const safeVendorId = caller.id;
    const safeBranchId = caller.branch?.id || data.branchId;
    const billingEntity = normalizeFiscalEntityFromBranch(caller.branch);

    if (!data.items || data.items.length === 0) {
        return { success: false, error: "El carrito está vacío." };
    }

    if (data.invoiceData?.generate) {
        if (!["A", "B"].includes(data.invoiceData.invoiceType)) {
            return { success: false, error: "Tipo de factura inválido." };
        }
        if (!["CUIT", "DNI", "FINAL"].includes(data.invoiceData.docType)) {
            return { success: false, error: "Tipo de documento inválido." };
        }
        if (!data.invoiceData.salesPoint || data.invoiceData.salesPoint <= 0) {
            return { success: false, error: "Punto de venta inválido." };
        }
        if (!data.invoiceData.customerName?.trim()) {
            return { success: false, error: "Nombre del cliente requerido para la factura." };
        }
    }

    if (data.paymentMethod === "SPLIT") {
        const paymentsTotal = data.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        if (Math.abs(paymentsTotal - data.total) > 1) {
            return {
                success: false,
                error: `Error en montos: Total venta $${data.total}, Pagos $${paymentsTotal}`
            };
        }
    }

    let afipResult: Awaited<ReturnType<typeof generateAfipInvoiceForSale>> | null = null;
    let totalNet = 0;
    let totalVat = 0;

    if (data.invoiceData && data.invoiceData.generate) {
        try {
            afipResult = await generateAfipInvoiceForSale(data, safeBranchId, billingEntity);
            totalNet = afipResult.totalNet;
            totalVat = afipResult.totalVat;
        } catch (error: unknown) {
            console.error("Error creating invoice:", error);
            const message = error instanceof Error ? error.message : "Error al generar factura en AFIP.";
            return { success: false, error: message };
        }
    }

    try {
        const { transactionResult, negativeStockItems } = await saveSaleTransaction(
            data,
            safeVendorId,
            safeBranchId,
            afipResult,
            totalNet,
            totalVat
        );

        revalidatePath("/vendor/sales");
        revalidatePath("/vendor/repairs");
        revalidatePath("/vendor/dashboard");

        await sendPostSaleNotifications(
            data,
            transactionResult,
            safeVendorId,
            safeBranchId,
            negativeStockItems
        );

        return {
            success: true,
            saleId: transactionResult.saleId,
            saleNumber: transactionResult.saleNumber,
            invoice: afipResult ? {
                cae: afipResult.cae,
                caeExpiresAt: afipResult.caeExpiresAt,
                number: afipResult.voucherNumber
            } : undefined
        };

    } catch (error: unknown) {
        console.error("Error processing sale FULL:", error);
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Error al procesar la venta: ${message}` };
    }
}
