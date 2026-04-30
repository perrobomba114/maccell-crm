import { db } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";

export async function saveSaleTransaction(
    data: any,
    vendorId: string,
    branchId: string,
    afipResult: any,
    totalNet: number,
    totalVat: number
) {
    const negativeStockItems: { name: string; available: number; requested: number }[] = [];

    const transactionResult = await db.$transaction(async (tx) => {
        const saleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
                    invoiceNumber: afipResult.voucherNumber,
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
                } as any
            });
        }

        const txAny = tx as any;
        if (data.payments && data.payments.length > 0) {
            await txAny.salePayment.createMany({
                data: data.payments.map((p: any) => ({
                    saleId: sale.id,
                    method: p.method as PaymentMethod,
                    amount: p.amount
                }))
            });
        } else {
            await txAny.salePayment.create({
                data: {
                    saleId: sale.id,
                    method: (data.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
                    amount: data.total
                }
            });
        }

        for (const item of data.items) {
            if (item.type === "PRODUCT") {
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
                        originalPrice: item.originalPrice,
                        priceChangeReason: item.priceChangeReason
                    }
                });
            }
        }
        return { saleNumber, saleId: sale.id };
    });

    return { transactionResult, negativeStockItems };
}
