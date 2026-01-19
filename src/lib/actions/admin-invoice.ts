"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createAfipInvoice, getTaxpayerDetails } from "@/lib/afip";

// Helper for formatting doubles
function formatAmount(num: number) {
    return Math.round(num * 100) / 100;
}

// Wrapper for CUIT Search to be used by Client Component
export async function searchCuit(cuit: number) {
    return await getTaxpayerDetails(cuit);
}

export type AdminInvoiceItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    vatCondition: "21" | "10.5"; // Simplification for now
};

export async function generateAdminInvoice(data: {
    branchId: string;
    userId: string;
    customer: {
        docType: "CUIT" | "DNI" | "FINAL";
        docNumber: string;
        name: string;
        address: string;
        ivaCondition: string; // Just for reference
    };
    items: AdminInvoiceItem[];
    salesPoint: number;
    invoiceType: "A" | "B"; // Admin selects this explicitly
    paymentMethod: "CASH" | "CARD" | "TRANSFER" | "OTHER";
    concept?: number;
    serviceDateFrom?: string; // YYYY-MM-DD
    serviceDateTo?: string; // YYYY-MM-DD
    paymentDueDate?: string; // YYYY-MM-DD
}) {
    console.log("Generating Admin Invoice...", data);

    try {
        if (!data.items || data.items.length === 0) {
            return { success: false, error: "Debe agregar al menos un ítems." };
        }

        // 1. Calculate Totals (Server-side validation)
        let totalNet21 = 0;
        let totalVat21 = 0;
        let totalNet105 = 0;
        let totalVat105 = 0;

        for (const item of data.items) {
            const itemTotal = item.quantity * item.unitPrice;
            // Assuming the Unit Price entered IS "Final" (Tax Included)
            let rate = 1.21;
            let is21 = true;

            if (item.vatCondition === "10.5") {
                rate = 1.105;
                is21 = false;
            }

            const net = itemTotal / rate;
            const vat = itemTotal - net;

            if (is21) {
                totalNet21 += net;
                totalVat21 += vat;
            } else {
                totalNet105 += net;
                totalVat105 += vat;
            }
        }

        totalNet21 = formatAmount(totalNet21);
        totalVat21 = formatAmount(totalVat21);
        totalNet105 = formatAmount(totalNet105);
        totalVat105 = formatAmount(totalVat105);

        const totalNet = formatAmount(totalNet21 + totalNet105);
        const totalVat = formatAmount(totalVat21 + totalVat105);
        const totalAmount = formatAmount(totalNet + totalVat);

        // Prepare detailed IVA items for AFIP
        const ivaItems = [];
        if (totalNet21 > 0) {
            ivaItems.push({ id: 5, base: totalNet21, amount: totalVat21 });
        }
        if (totalNet105 > 0) {
            ivaItems.push({ id: 4, base: totalNet105, amount: totalVat105 });
        }

        // 2. Prepare AFIP Payload
        const concept = data.concept || 1; // 1: Products, 2: Services, 3: Mixed

        let serviceDateFrom: string | undefined;
        let serviceDateTo: string | undefined;
        let paymentDueDate: string | undefined;

        if (concept !== 1) {
            if (!data.serviceDateFrom || !data.serviceDateTo || !data.paymentDueDate) {
                return { success: false, error: "Para Servicios, las fechas son obligatorias." };
            }
            serviceDateFrom = data.serviceDateFrom;
            serviceDateTo = data.serviceDateTo;
            paymentDueDate = data.paymentDueDate;
        }

        const docNumber = parseInt(data.customer.docNumber.replace(/\D/g, '')) || 0;
        let docTypeCode = 99; // Final
        if (data.customer.docType === "CUIT") docTypeCode = 80;
        if (data.customer.docType === "DNI") docTypeCode = 96;

        const voucherType = data.invoiceType === "A" ? 1 : 6; // 6 = B

        const afipData = {
            salesPoint: data.salesPoint,
            type: voucherType,
            concept: concept,
            docType: docTypeCode,
            docNumber: docNumber,
            cbteDesde: 0, // Ignored
            cbteHasta: 0, // Ignored
            amount: totalAmount,
            vatAmount: totalVat,
            netAmount: totalNet,
            exemptAmount: 0,
            ivaItems: ivaItems, // NEW: Detailed VAT
            // Dates required if Concept != 1
            serviceDateFrom: serviceDateFrom,
            serviceDateTo: serviceDateTo,
            paymentDueDate: paymentDueDate
        };

        // 3. Call AFIP
        const afipRes = await createAfipInvoice(afipData);

        if (!afipRes.success) {
            return { success: false, error: "AFIP Error: " + afipRes.error };
        }

        if (!afipRes.data) {
            throw new Error("AFIP returned success but no data.");
        }
        const cae = afipRes.data.cae;
        const caeFchVto = afipRes.data.caeFchVto;
        // @ts-ignore - Arca SDK type definition might be missing cbteNro or similar in interface but it exists in runtime
        const voucherNum = afipRes.data.voucherNumber || afipRes.data.cbteNro || 0;

        // 4. Create Sale & Invoice in DB
        const saleNumber = `ADM-${Date.now()}`;

        await db.$transaction(async (tx) => {
            // Create Sale
            const sale = await tx.sale.create({
                data: {
                    saleNumber,
                    total: totalAmount,
                    vendorId: data.userId, // Admin
                    branchId: data.branchId, // Selected Branch
                    paymentMethod: "CASH" // Default or passed? (Assume Cash/Other for Admin)
                }
            });

            // Create Items
            /*
            await tx.saleItem.createMany({
                data: data.items.map(i => ({
                    saleId: sale.id,
                    name: i.description,
                    quantity: i.quantity,
                    price: i.unitPrice,
                    productId: null // No product link for manual items
                }))
            });
            */
            // loop for sale items
            for (const item of data.items) {
                await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        name: item.description,
                        quantity: item.quantity,
                        price: item.unitPrice,
                        productId: null
                    }
                })
            }

            // Create Invoice
            // Format number?
            // If the SDK result doesn't give the number, we might guess it.
            // But let's look at `afip.ts`: `return { success: true, data: res };`

            // We'll trust the flow succeeded.
            // For proper Number display we might need to fetch last again or use returned data.
            // Only `CAE` is critical.

            // Let's try to parse expiration
            let caeExpiresAt = new Date();
            if (caeFchVto && caeFchVto.length === 8) {
                const y = parseInt(caeFchVto.substring(0, 4));
                const m = parseInt(caeFchVto.substring(4, 6)) - 1;
                const d = parseInt(caeFchVto.substring(6, 8));
                caeExpiresAt = new Date(y, m, d);
            }

            await tx.saleInvoice.create({
                data: {
                    saleId: sale.id,
                    invoiceType: data.invoiceType,
                    invoiceNumber: `${data.salesPoint.toString().padStart(5, '0')}-${(voucherNum || 0).toString().padStart(8, '0')}`,
                    cae: cae,
                    caeExpiresAt: caeExpiresAt,
                    customerDocType: data.customer.docType,
                    customerDoc: data.customer.docNumber,
                    customerName: data.customer.name,
                    customerAddress: data.customer.address,
                    netAmount: totalNet,
                    vatAmount: totalVat,
                    totalAmount: totalAmount
                }
            });
        });

        revalidatePath("/admin/invoices");
        return { success: true };

    } catch (error: any) {
        console.error("Generate Admin Invoice Error:", error);
        return { success: false, error: error.message };
    }
}
