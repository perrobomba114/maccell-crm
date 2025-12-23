"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PaymentMethod } from "@prisma/client";

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
};

/**
 * Search for products available for sale.
 * Filters out items that are strictly SpareParts (by not querying them) 
 * and optionally checks CategoryType if Products can be parts.
 */
export async function searchProductsForPos(term: string, branchId: string): Promise<PosProduct[]> {
    console.log(`[searchProductsForPos] Searching for "${term}" in branch "${branchId}"`);
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
    console.log(`[searchRepairsForPos] Searching for "${term}" in branch "${branchId}"`);
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
            status: r.status.name
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
                status: repair.status.name
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
}) {
    console.log("[processPosSale] Starting sale processing...", {
        total: data.total,
        method: data.paymentMethod,
        itemsCount: data.items?.length
    });

    if (!data.items || data.items.length === 0) {
        return { success: false, error: "El carrito está vacío." };
    }

    // Validation: Split Payments
    if (data.paymentMethod === "SPLIT") {
        const paymentsTotal = data.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        // Allow small floating point diff
        if (Math.abs(paymentsTotal - data.total) > 1) {
            return {
                success: false,
                error: `Error en montos: Total venta $${data.total}, Pagos $${paymentsTotal}`
            };
        }
    }

    try {
        const transactionResult = await db.$transaction(async (tx) => {
            console.log("[processPosSale] Transaction started");

            // 1. Create Sale Header
            const saleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const sale = await tx.sale.create({
                data: {
                    saleNumber,
                    total: data.total,
                    vendorId: data.vendorId,
                    branchId: data.branchId,
                    paymentMethod: (data.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
                }
            });
            console.log("[processPosSale] Sale header created:", sale.id);

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
                                branchId: data.branchId
                            }
                        }
                    });

                    if (stock) {
                        await tx.productStock.update({
                            where: { id: stock.id },
                            data: { quantity: { decrement: item.quantity } }
                        });
                    } else {
                        await tx.productStock.create({
                            data: {
                                productId: item.id,
                                branchId: data.branchId,
                                quantity: -item.quantity
                            }
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
                    // Update Repair Status
                    // WARNING: Hardcoded Status ID 10. Ensure this exists in DB.
                    await tx.repair.update({
                        where: { id: item.id },
                        data: {
                            statusId: 10, // Delivered/Paid
                        }
                    });

                    await tx.repairObservation.create({
                        data: {
                            repairId: item.id,
                            userId: data.vendorId,
                            content: `Reparación cobrada en Venta #${saleNumber}. Total: $${item.price}`
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
            return { saleNumber };
        });

        console.log("[processPosSale] Transaction committed successfully");
        revalidatePath("/vendor/sales");
        revalidatePath("/vendor/repairs");
        revalidatePath("/vendor/dashboard");

        return { success: true, saleId: transactionResult.saleNumber };

    } catch (error) {
        console.error("Error processing sale FULL:", error);
        return { success: false, error: `Error al procesar la venta: ${(error as any).message}` };
    }
}
