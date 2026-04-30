import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { createNotificationAction } from "@/lib/actions/notifications";

export async function sendPostSaleNotifications(
    data: any,
    transactionResult: any,
    vendorId: string,
    branchId: string,
    negativeStockItems: { name: string; available: number; requested: number }[]
) {
    try {
        const overrideItems = data.items.filter((item: any) => {
            return item.originalPrice !== undefined &&
                item.originalPrice !== null &&
                Math.abs(item.originalPrice - item.price) > 0.01;
        });

        if (overrideItems.length > 0) {
            const admins = await db.user.findMany({
                where: { role: Role.ADMIN },
                select: { id: true }
            });

            if (admins.length > 0) {
                const vendor = await db.user.findUnique({
                    where: { id: vendorId },
                    select: { name: true }
                });
                const vendorName = vendor?.name || "Un vendedor";

                const details = overrideItems.map((i: any) =>
                    `${i.name}: $${i.originalPrice} -> $${i.price} (${i.priceChangeReason || "Sin motivo"})`
                ).join("\n");

                const notificationPromises = admins.map(admin => createNotificationAction({
                    userId: admin.id,
                    title: "⚠️ Cambio de Precio Detectado",
                    message: `${vendorName} modificó precios en Venta #${transactionResult.saleNumber}:\n${details}`,
                    type: "WARNING",
                    link: `/admin/sales?search=${transactionResult.saleNumber}`
                }));

                await Promise.all(notificationPromises);
            }
        }
    } catch (notifError) {
        console.error("[processPosSale] Error sending admin notifications:", notifError);
    }

    if (negativeStockItems.length > 0) {
        try {
            const admins = await db.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
            if (admins.length > 0) {
                const vendor = await db.user.findUnique({ where: { id: vendorId }, select: { name: true, branch: { select: { name: true } } } });
                const vendorName = (vendor as any)?.name || "Un vendedor";
                const branchName = (vendor as any)?.branch?.name || branchId;
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
}
