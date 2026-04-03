"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PaymentMethod, Role } from "@prisma/client";
import { createNotificationAction } from "@/lib/actions/notifications";
import { getCurrentUser } from "@/actions/auth-actions";

export type PosProduct = {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    categoryName?: string;
};

export type PosRepair = {
    id: string;
    ticketNumber: string;
    device: string; // Brand + Model
    customerName: string;
    price: number; // estimatedPrice or final
    status: string;
    isWet?: boolean;
};

/**
 * Search for products available for sale.
 * Filters out items that are strictly SpareParts (by not querying them) 
 * and optionally checks CategoryType if Products can be parts.
 */
export async function searchProductsForPos(term: string, branchId: string): Promise<PosProduct[]> {
    const caller = await getCurrentUser();
    if (!caller) return [];
    console.log(`[searchProductsForPos] User: ${caller.name} (${caller.role}) | Branch: ${branchId} | Query: "${term}"`);
    if (!term || term.length < 2) return [];

    try {
        const products = await db.product.findMany({
            where: {
                OR: [
                    { name: { contains: term, mode: "insensitive" } },
                    { sku: { contains: term, mode: "insensitive" } }
                ]
                // Removed strict category filter to allow uncategorized products or all products in the table
            },
            include: {
                category: true,
                stock: {
                    where: { branchId }
                }
            },
            take: 20
        });

        console.log(`[searchProductsForPos] Found ${products.length} products`);

        // Map to simpler structure
        return products.map(p => {
            const branchStock = p.stock[0]?.quantity || 0;
            return {
                id: p.id,
                name: p.name,
                sku: p.sku,
                price: p.price,
                stock: branchStock,
                categoryName: p.category?.name
            };
        });

    } catch (error) {
        console.error("Error searching products:", error);
        return [];
    }
}

/**
 * Search for repairs by ticket number, customer name, or phone.
 * Returns a list of matches.
 */
export async function searchRepairsForPos(term: string, branchId: string): Promise<PosRepair[]> {
    const caller = await getCurrentUser();
    if (!caller) return [];
    console.log(`[searchRepairsForPos] User: ${caller.name} (${caller.role}) | Branch: ${branchId} | Query: "${term}"`);
    if (!term || term.length < 2) return [];

    try {
        const repairs = await db.repair.findMany({
            where: {
                branchId,
                statusId: { notIn: [1, 2, 3] }, // Exclude invalid statuses if needed, OR adjust as per logic
                OR: [
                    { ticketNumber: { contains: term, mode: "insensitive" } },
                    { customer: { name: { contains: term, mode: "insensitive" } } },
                    { customer: { phone: { contains: term, mode: "insensitive" } } }
                ]
            },
            include: {
                customer: true,
                status: true
            },
            take: 12, // Increased for grid
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[searchRepairsForPos] Found ${repairs.length} repairs`);

        return repairs.map(r => ({
            id: r.id,
            ticketNumber: r.ticketNumber,
            device: `${r.deviceBrand} ${r.deviceModel}`,
            customerName: r.customer.name,
            price: r.estimatedPrice || 0,
            status: r.status.name,
            isWet: r.isWet
        }));

    } catch (error) {
        console.error("Error searching repairs:", error);
        return [];
    }
}

/**
 * Find a repair by its Ticket Number (ID).
 * Validates it belongs to the branch (optional strictness).
 */
export async function getRepairForPos(ticketNumber: string, branchId: string): Promise<{ success: boolean, repair?: PosRepair, error?: string }> {
    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "No autorizado" };
    if (!ticketNumber) return { success: false, error: "Ingrese un número de ticket" };

    try {
        const repair = await db.repair.findFirst({
            where: {
                ticketNumber: ticketNumber,
                branchId: branchId // Enforce branch access
            },
            include: {
                customer: true,
                status: true
            }
        });

        if (!repair) {
            return { success: false, error: "Reparación no encontrada o no pertenece a esta sucursal." };
        }

        // Check if already paid or closed? 
        // For now, let's allow retrieving it. The UI can warn if status is "Entregado".

        const price = repair.estimatedPrice || 0;

        return {
            success: true,
            repair: {
                id: repair.id,
                ticketNumber: repair.ticketNumber,
                device: `${repair.deviceBrand} ${repair.deviceModel}`,
                customerName: repair.customer.name,
                price: price,
                status: repair.status.name,
                isWet: repair.isWet
            }
        };

    } catch (error) {
        console.error("Error fetching repair:", error);
        return { success: false, error: "Error de servidor al buscar reparación." };
    }
}

/**
 * Process the Sale.
 * - Creates Sale record
 * - Decrements Product Stock
 * - Updates Repair Status (e.g. to Delivered/Paid)
 */
// ... imports
import { createAfipInvoice, getLastVoucher } from "@/lib/afip";
import { getIvaConditionId } from "@/lib/afip-utils";

// Helper to format date YYYYMMDD using Argentina timezone (UTC-3)
const formatDateAFIP = (date: Date) => {
    const argDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return parseInt(argDate.toISOString().split('T')[0].replace(/-/g, ''));
};

const formatAmount = (num: number) => Math.round(num * 100) / 100;

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
    // NEW: Invoice Data
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
    // Use authenticated user's IDs to prevent client spoofing
    const safeVendorId = caller.id;
    const safeBranchId = caller.branch?.id || data.branchId;

    console.log(`[processPosSale] User: ${caller.name} (${caller.role}) | Branch: ${safeBranchId} | Total: $${data.total} | Items: ${data.items?.length} | Payment: ${data.paymentMethod}${data.invoiceData?.generate ? ` | Factura ${data.invoiceData.invoiceType}` : ''}`);

    if (!data.items || data.items.length === 0) {
        return { success: false, error: "El carrito está vacío." };
    }

    // Validation: Invoice Data
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

    // Validation: Split Payments
    if (data.paymentMethod === "SPLIT") {
        const paymentsTotal = data.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        if (Math.abs(paymentsTotal - data.total) > 1) {
            return {
                success: false,
                error: `Error en montos: Total venta $${data.total}, Pagos $${paymentsTotal}`
            };
        }
    }

    // ARCA / AFIP Logic Preparation
    let afipResult: any = null;
    let caeExpiresAt: Date | null = null;
    let voucherNumberString = "";
    let totalNet = 0;
    let totalVat = 0;

    if (data.invoiceData && data.invoiceData.generate) {
        try {
            console.log("[processPosSale] Starting AFIP Sequence");

            const voucherType = data.invoiceData.invoiceType === "A" ? 1 : 6;
            let docTypeCode = 99;
            if (data.invoiceData.docType === "CUIT") docTypeCode = 80;
            if (data.invoiceData.docType === "DNI") docTypeCode = 96;

            const docNumber = parseInt(data.invoiceData.docNumber.replace(/\D/g, '')) || 0;

            // Calculate Nets & VATs
            let totalNet21 = 0;
            let totalVat21 = 0;
            let totalNet105 = 0;
            let totalVat105 = 0;

            for (const item of data.items) {
                const itemTotal = item.price * item.quantity;
                const isRepair = item.type === "REPAIR";
                // Repairs are now 21% as requested, so everything is 21% for now
                // but keeping logic if future rates differ
                const rate = 1.21;

                const net = itemTotal / rate;
                const vat = itemTotal - net;

                // All items (Products & Repairs) go to 21% bucket now
                totalNet21 += net;
                totalVat21 += vat;
            }

            // --- FINAL ROUNDING ADJUSTMENT ---
            // Ensure sum(Net) + sum(Vat) = Total EXACTLY for each rate group
            // We use totalNet21 as the anchor
            const finalNet21 = formatAmount(totalNet21);
            const finalVat21 = formatAmount(totalVat21);
            const finalNet105 = formatAmount(totalNet105);
            const finalVat105 = formatAmount(totalVat105);

            totalNet = finalNet21 + finalNet105;
            totalVat = finalVat21 + finalVat105;

            // Prepare detailed IVA items for AFIP
            const ivaItems = [];
            if (finalNet21 > 0) {
                ivaItems.push({ id: 5, base: finalNet21, amount: finalVat21 });
            }
            if (finalNet105 > 0) {
                ivaItems.push({ id: 4, base: finalNet105, amount: finalVat105 });
            }

            // Call Standard AFIP Invoice Creator
            const afipRes = await createAfipInvoice({
                salesPoint: data.invoiceData.salesPoint,
                type: voucherType,
                concept: data.invoiceData.concept || 1,
                docType: docTypeCode,
                docNumber: docNumber,
                cbteDesde: 0, // Ignored
                cbteHasta: 0, // Ignored
                amount: data.total,
                vatAmount: formatAmount(totalVat),
                netAmount: formatAmount(totalNet),
                exemptAmount: 0,
                ivaItems: ivaItems, // NEW: Detailed VAT
                serviceDateFrom: data.invoiceData.serviceDateFrom,
                serviceDateTo: data.invoiceData.serviceDateTo,
                paymentDueDate: data.invoiceData.paymentDueDate,
                ivaConditionId: getIvaConditionId(data.invoiceData.ivaCondition || ""),
                branchId: safeBranchId // Pass Branch ID for multi-cert support
            });

            if (!afipRes.success || !afipRes.data) {
                throw new Error(afipRes.error || "Error desconocido en AFIP");
            }

            const caeData = afipRes.data as any;
            console.log("[POS] AFIP Response Data:", JSON.stringify(caeData, null, 2));

            // Handle massive SDK variations
            const rawVoucher = caeData.voucherNumber || caeData.cbteNro || caeData.CbteNro || (caeData.FECAESolicitarResult ? caeData.FECAESolicitarResult.FeDetReq[0].CbteDesde : undefined);
            const rawCae = caeData.cae || caeData.CAE || (caeData.FECAESolicitarResult ? caeData.FECAESolicitarResult.FeDetReq[0].CAE : undefined);
            const rawCaeFchVto = caeData.caeFchVto || caeData.CAEFchVto || (caeData.FECAESolicitarResult ? caeData.FECAESolicitarResult.FeDetReq[0].CAEFchVto : undefined);

            const voucherStr = rawVoucher ? String(rawVoucher).trim() : '';
            const caeStr = rawCae ? String(rawCae).trim() : '';
            if (!voucherStr || !caeStr) {
                console.error("Critical: Missing or empty Voucher/CAE in response", caeData);
                throw new Error("AFIP no devolvió CAE ni Número de Comprobante válidos. Revisar Logs.");
            }

            afipResult = {
                cae: caeStr,
                voucherNumber: voucherStr
            };

            // Format CAEFchVto (YYYYMMDD) to Date — convert to string first (AFIP may return number)
            if (rawCaeFchVto) {
                const raw = String(rawCaeFchVto);
                const y = raw.slice(0, 4);
                const m = raw.slice(4, 6);
                const d = raw.slice(6, 8);
                caeExpiresAt = new Date(`${y}-${m}-${d}`);
            }

            // Format Voucher Number: PtoVta (5 chars) - Number (8 chars)
            const ptoVta = data.invoiceData.salesPoint.toString().padStart(5, '0');
            const voucherNum = afipResult.voucherNumber.toString().padStart(8, '0');
            voucherNumberString = `${ptoVta}-${voucherNum}`;

        } catch (error: any) {
            console.error("Error creating invoice:", error);
            // Pass the original error message to the UI
            return { success: false, error: error.message || "Error al generar factura en AFIP." };
        }
    }


    // Track products sold below available stock for post-transaction admin notification
    const negativeStockItems: { name: string; available: number; requested: number }[] = [];

    try {
        const transactionResult = await db.$transaction(async (tx) => {
            console.log("[processPosSale] Transaction started");

            // 1. Create Sale Header
            const saleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const sale = await tx.sale.create({
                data: {
                    saleNumber,
                    total: data.total,
                    vendorId: safeVendorId,
                    branchId: safeBranchId,
                    paymentMethod: (data.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
                }
            });
            console.log("[processPosSale] Sale header created:", sale.id);

            // 1.5 Save Invoice if applicable
            if (afipResult && data.invoiceData) {
                // Determine Billing Entity based on Branch
                // Logic mirrors afip.ts prioritization
                const branch = await tx.branch.findUnique({ where: { id: safeBranchId } });
                const is8Bit = branch?.code === '8BIT' || branch?.name?.toUpperCase().includes('8 BIT');
                const billingEntity = is8Bit ? '8BIT' : 'MACCELL';

                await tx.saleInvoice.create({
                    data: {
                        saleId: sale.id,
                        invoiceType: data.invoiceData.invoiceType,
                        invoiceNumber: voucherNumberString,
                        cae: afipResult.cae,
                        caeExpiresAt: caeExpiresAt || new Date(), // Fallback? required
                        customerDocType: data.invoiceData.docType,
                        customerDoc: data.invoiceData.docNumber,
                        customerName: data.invoiceData.customerName,
                        customerAddress: data.invoiceData.customerAddress,
                        // Store totals
                        // Store totals
                        // Use the exact calculated values sent to AFIP
                        netAmount: formatAmount(totalNet),
                        vatAmount: formatAmount(totalVat),
                        totalAmount: data.total,
                        billingEntity: billingEntity
                    } as any
                });
            }

            // 1.1 Create Payments
            // Note: explicit casting used due to strict typing lag in some environments
            const txAny = tx as any;
            if (!txAny.salePayment) {
                throw new Error("INTERNAL ERROR: SalePayment model not found in DB Client. Try restarting the server.");
            }

            if (data.payments && data.payments.length > 0) {
                console.log("[processPosSale] Creating partial payments:", data.payments.length);
                await txAny.salePayment.createMany({
                    data: data.payments.map(p => ({
                        saleId: sale.id,
                        method: p.method as PaymentMethod,
                        amount: p.amount
                    }))
                });
            } else {
                // Legacy/Single Payment Support
                console.log("[processPosSale] Creating single payment");
                await txAny.salePayment.create({
                    data: {
                        saleId: sale.id,
                        method: (data.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
                        amount: data.total
                    }
                });
            }

            // 2. Process Items
            for (const item of data.items) {
                if (item.type === "PRODUCT") {
                    // Update Stock
                    const stock = await tx.productStock.findUnique({
                        where: {
                            productId_branchId: {
                                productId: item.id,
                                branchId: safeBranchId
                            }
                        }
                    });

                    // Note: findUnique 'where' argument needs exact composite key structure.
                    // Previous code:
                    /*
                    where: {
                        productId_branchId: {
                            productId: item.id,
                            branchId: safeBranchId
                        }
                    }
                    */

                    const available = stock?.quantity ?? 0;
                    if (available < item.quantity) {
                        // Allow negative — track for admin notification
                        negativeStockItems.push({ name: item.name, available, requested: item.quantity });
                    }
                    if (stock) {
                        await tx.productStock.update({
                            where: { id: stock.id },
                            data: { quantity: { decrement: item.quantity } }
                        });
                    } else {
                        await tx.productStock.create({
                            data: { productId: item.id, branchId: safeBranchId, quantity: -item.quantity }
                        });
                    }

                    // Create SaleItem
                    await tx.saleItem.create({
                        data: {
                            saleId: sale.id,
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            productId: item.id,
                            originalPrice: item.originalPrice,
                            priceChangeReason: item.priceChangeReason
                        }
                    });

                } else if (item.type === "REPAIR") {
                    const oldRepair = await tx.repair.findUnique({
                        where: { id: item.id },
                        select: { statusId: true }
                    });

                    await tx.repair.update({
                        where: { id: item.id },
                        data: {
                            statusId: 10, // Delivered/Paid
                            statusHistory: {
                                create: {
                                    fromStatusId: oldRepair?.statusId,
                                    toStatusId: 10,
                                    userId: safeVendorId
                                }
                            }
                        }
                    });

                    await tx.repairObservation.create({
                        data: {
                            repairId: item.id,
                            userId: safeVendorId,
                            content: `Reparación cobrada en Venta #${saleNumber}. Total: $${item.price}`.substring(0, 500)
                        }
                    });

                    // Create SaleItem
                    await tx.saleItem.create({
                        data: {
                            saleId: sale.id,
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            repairId: item.id,
                            originalPrice: item.originalPrice,
                            priceChangeReason: item.priceChangeReason
                        }
                    });
                }
            }
            return { saleNumber, saleId: sale.id };
        });

        console.log("[processPosSale] Transaction committed successfully");
        revalidatePath("/vendor/sales");
        revalidatePath("/vendor/repairs");
        revalidatePath("/vendor/dashboard");

        // 3. Post-Transaction: Check for Price Overrides and Notify Admins
        try {
            const overrideItems = data.items.filter(item => {
                // Check if originalPrice exists and is different from final price
                return item.originalPrice !== undefined &&
                    item.originalPrice !== null &&
                    Math.abs(item.originalPrice - item.price) > 0.01; // epsilon check
            });

            if (overrideItems.length > 0) {
                console.log(`[processPosSale] Found ${overrideItems.length} price overrides. Notifying Admins...`);

                // Get all ADMIN users
                const admins = await db.user.findMany({
                    where: { role: Role.ADMIN },
                    select: { id: true }
                });

                if (admins.length > 0) {
                    // Get Vendor Name (we only have ID, fetch name for nice message)
                    const vendor = await db.user.findUnique({
                        where: { id: safeVendorId },
                        select: { name: true }
                    });
                    const vendorName = vendor?.name || "Un vendedor";

                    // Construct Message
                    // If multiple items, summarize.
                    const details = overrideItems.map(i =>
                        `${i.name}: $${i.originalPrice} -> $${i.price} (${i.priceChangeReason || "Sin motivo"})`
                    ).join("\n");

                    const notificationPromises = admins.map(admin => createNotificationAction({
                        userId: admin.id,
                        title: "⚠️ Cambio de Precio Detectado",
                        message: `${vendorName} modificó precios en Venta #${transactionResult.saleNumber}:\n${details}`,
                        type: "WARNING",
                        link: `/admin/sales?search=${transactionResult.saleNumber}` // Deep link if possible
                    }));

                    await Promise.all(notificationPromises);
                    console.log(`[processPosSale] Sent notifications to ${admins.length} admins.`);
                }
            }
        } catch (notifError) {
            console.error("[processPosSale] Error sending admin notifications:", notifError);
            // Non-blocking error, sale already succeeded
        }

        // 4. Post-Transaction: Notify Admins of Negative Stock Sales
        if (negativeStockItems.length > 0) {
            try {
                const admins = await db.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
                if (admins.length > 0) {
                    const vendor = await db.user.findUnique({ where: { id: safeVendorId }, select: { name: true, branch: { select: { name: true } } } });
                    const vendorName = (vendor as any)?.name || "Un vendedor";
                    const branchName = (vendor as any)?.branch?.name || safeBranchId;
                    const details = negativeStockItems.map(i =>
                        `${i.name} (disponible: ${i.available}, vendido: ${i.requested})`
                    ).join(", ");
                    await Promise.all(admins.map(admin => createNotificationAction({
                        userId: admin.id,
                        title: "⚠️ Venta con Stock Negativo",
                        message: `${vendorName} (${branchName}) vendió con stock insuficiente en Venta #${transactionResult.saleNumber}: ${details}`,
                        type: "WARNING",
                        link: `/admin/sales?search=${transactionResult.saleNumber}`
                    })));
                }
            } catch (negNotifError) {
                console.error("[processPosSale] Error sending negative stock notifications:", negNotifError);
            }
        }

        return {
            success: true,
            saleId: transactionResult.saleId,
            saleNumber: transactionResult.saleNumber,
            invoice: afipResult ? {
                cae: afipResult.cae,
                caeExpiresAt: caeExpiresAt,
                number: voucherNumberString
            } : undefined
        };

    } catch (error) {
        console.error("Error processing sale FULL:", error);
        return { success: false, error: `Error al procesar la venta: ${(error as any).message}` };
    }
}

import { getTaxpayerDetails } from "@/lib/afip";

export async function getAfipPadronData(cuit: string) {
    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "No autorizado" };
    // Validate CUIT format roughly
    const cleanCuit = cuit.replace(/\D/g, "");
    if (cleanCuit.length !== 11) {
        return { success: false, error: "CUIT inválido (debe tener 11 números)" };
    }

    const cuitNum = parseFloat(cleanCuit);

    return await getTaxpayerDetails(cuitNum);
}
