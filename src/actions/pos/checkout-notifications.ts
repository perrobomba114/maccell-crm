import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { createNotificationAction } from "@/lib/actions/notifications";

export async function sendPostSaleNotifications(
    transactionResult: { saleNumber: string },
    vendorId: string,
    branchId: string,
    negativeStockItems: { name: string; available: number; requested: number }[]
) {
    if (negativeStockItems.length > 0) {
        try {
            const admins = await db.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
            if (admins.length > 0) {
                const vendor = await db.user.findUnique({ where: { id: vendorId }, select: { name: true, branch: { select: { name: true } } } });
                const vendorName = vendor?.name || "Un vendedor";
                const branchName = vendor?.branch?.name || branchId;
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
