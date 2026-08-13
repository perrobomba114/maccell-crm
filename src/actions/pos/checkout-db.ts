import { db } from "@/lib/db";
import { PaymentMethod, Role } from "@prisma/client";
import { isPosDeliveryBlockedStatus } from "@/lib/repairs/status";
import {
    buildPriceChangeNotificationMessage,
    getPriceChangeItems,
    type PosPriceChangeItem,
} from "./price-change-notification";

const DELIVERED_REPAIR_STATUS_IDS = [10] as const;

type PosSaleItem = {
    type: "PRODUCT" | "REPAIR";
    id: string;
    quantity: number;
    price: number;
    name: string;
    originalPrice?: number;
    priceChangeReason?: string;
};

type PosSaleData = {
    total: number;
    paymentMethod?: "CASH" | "CARD" | "MERCADOPAGO" | "SPLIT";
    payments?: Array<{ method: "CASH" | "CARD" | "MERCADOPAGO" | "SPLIT"; amount: number }>;
    invoiceData?: {
        invoiceType: "A" | "B";
        docType: "CUIT" | "DNI" | "FINAL";
        docNumber: string;
        customerName: string;
        customerAddress?: string;
    };
    items: PosSaleItem[];
};

type AfipSaleResult = {
    voucherNumber: string;
    cae: string;
    caeExpiresAt?: Date | null;
};

export async function saveSaleTransaction(
    data: PosSaleData,
    vendorId: string,
    branchId: string,
    afipResult: AfipSaleResult | null,
    totalNet: number,
    totalVat: number
) {
    const negativeStockItems: { name: string; available: number; requested: number }[] = [];

    const transactionResult = await db.$transaction(async (tx) => {
        const saleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const normalizedPriceItems: PosPriceChangeItem[] = [];

        const sale = await tx.sale.create({
            data: {
                saleNumber,
                total: data.total,
                vendorId: vendorId,
                branchId: branchId,
                paymentMethod: (data.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
            }
        });

        if (afipResult && data.invoiceData) {
            const branch = await tx.branch.findUnique({ where: { id: branchId } });
            const is8Bit = branch?.code === '8BIT' || branch?.name?.toUpperCase().includes('8 BIT');
            const billingEntity = is8Bit ? '8BIT' : 'MACCELL';

            await tx.saleInvoice.create({
                data: {
                    saleId: sale.id,
                    invoiceType: data.invoiceData.invoiceType,
                    invoiceNumber: String(afipResult.voucherNumber),
                    cae: afipResult.cae,
                    caeExpiresAt: afipResult.caeExpiresAt || new Date(),
                    customerDocType: data.invoiceData.docType,
                    customerDoc: data.invoiceData.docNumber,
                    customerName: data.invoiceData.customerName,
                    customerAddress: data.invoiceData.customerAddress,
                    netAmount: totalNet,
                    vatAmount: totalVat,
                    totalAmount: data.total,
                    billingEntity: billingEntity
                }
            });
        }

        if (data.payments && data.payments.length > 0) {
            await tx.salePayment.createMany({
                data: data.payments.map((p) => ({
                    saleId: sale.id,
                    method: p.method as PaymentMethod,
                    amount: p.amount
                }))
            });
        } else {
            await tx.salePayment.create({
                data: {
                    saleId: sale.id,
                    method: (data.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
                    amount: data.total
                }
            });
        }

        for (const item of data.items) {
            if (item.type === "PRODUCT") {
                const product = await tx.product.findUniqueOrThrow({
                    where: { id: item.id },
                    select: { price: true },
                });
                const authoritativeOriginalPrice = product.price;
                const stock = await tx.productStock.findUnique({
                    where: {
                        productId_branchId: {
                            productId: item.id,
                            branchId: branchId
                        }
                    }
                });

                const available = stock?.quantity ?? 0;
                if (available < item.quantity) {
                    negativeStockItems.push({ name: item.name, available, requested: item.quantity });
                }
                if (stock) {
                    await tx.productStock.update({
                        where: { id: stock.id },
                        data: { quantity: { decrement: item.quantity } }
                    });
                } else {
                    await tx.productStock.create({
                        data: { productId: item.id, branchId: branchId, quantity: -item.quantity }
                    });
                }

                await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        productId: item.id,
                        originalPrice: authoritativeOriginalPrice,
                        priceChangeReason: item.priceChangeReason
                    }
                });
                normalizedPriceItems.push({
                    name: item.name,
                    price: item.price,
                    originalPrice: authoritativeOriginalPrice,
                    priceChangeReason: item.priceChangeReason,
                });

            } else if (item.type === "REPAIR") {
                const oldRepair = await tx.repair.findUnique({
                    where: { id: item.id },
                    select: { statusId: true, estimatedPrice: true }
                });
                if (!oldRepair) {
                    throw new Error("No se encontró la reparación para cobrar.");
                }
                if (DELIVERED_REPAIR_STATUS_IDS.includes(oldRepair.statusId as typeof DELIVERED_REPAIR_STATUS_IDS[number])) {
                    throw new Error("La reparación ya fue cobrada y no puede volver a cargar.");
                }
                if (isPosDeliveryBlockedStatus(oldRepair.statusId)) {
                    throw new Error("La reparación no puede entregarse hasta que el técnico cambie su estado.");
                }
                const authoritativeOriginalPrice = oldRepair.estimatedPrice ?? item.originalPrice ?? item.price;

                await tx.repair.update({
                    where: { id: item.id },
                    data: {
                        statusId: 10,
                        statusHistory: {
                            create: {
                                fromStatusId: oldRepair?.statusId,
                                toStatusId: 10,
                                userId: vendorId
                            }
                        }
                    }
                });

                await tx.repairObservation.create({
                    data: {
                        repairId: item.id,
                        userId: vendorId,
                        content: `Reparación cobrada en Venta #${saleNumber}. Total: $${item.price}`.substring(0, 500)
                    }
                });

                await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        repairId: item.id,
                        originalPrice: authoritativeOriginalPrice,
                        priceChangeReason: item.priceChangeReason
                    }
                });
                normalizedPriceItems.push({
                    name: item.name,
                    price: item.price,
                    originalPrice: authoritativeOriginalPrice,
                    priceChangeReason: item.priceChangeReason,
                });
            }
        }

        const priceChangeItems = getPriceChangeItems(normalizedPriceItems);
        if (priceChangeItems.length > 0) {
            const [vendor, admins] = await Promise.all([
                tx.user.findUniqueOrThrow({ where: { id: vendorId }, select: { name: true } }),
                tx.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } }),
            ]);

            if (admins.length > 0) {
                const message = buildPriceChangeNotificationMessage(
                    vendor.name || "Un vendedor",
                    saleNumber,
                    priceChangeItems,
                );
                await tx.notification.createMany({
                    data: admins.map((admin) => ({
                        userId: admin.id,
                        title: "⚠️ Cambio de Precio Detectado",
                        message,
                        type: "WARNING",
                        link: `/admin/sales?search=${saleNumber}`,
                    })),
                });
            }
        }
        return { saleNumber, saleId: sale.id };
    });

    return { transactionResult, negativeStockItems };
}
