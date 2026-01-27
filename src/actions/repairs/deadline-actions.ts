"use server";

import { db } from "@/lib/db";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";

export async function checkUpcomingDeadlines(userId: string) {
    if (!userId) return [];

    try {
        const now = new Date();
        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

        // Find repairs that:
        // 1. Are active (Status 2, 3, 4)
        // 2. Are assigned to ME or UNASSIGNED
        // 3. PromisedAt is within the next 15 minutes (and not already passed significantly? or just pending)
        //    Let's say between NOW and NOW+15m. If it's already passed, maybe we should also alert? 
        //    The user requirement is "faltan 15 minutos". So strictly future.

        const repairs = await db.repair.findMany({
            where: {
                statusId: { in: [2, 3, 4] }, // Tomado, En Proceso, Pausado
                OR: [
                    { assignedUserId: userId },
                    { assignedUserId: null }
                ],
                promisedAt: {
                    gte: now,
                    lte: fifteenMinutesFromNow
                }
            },
            select: {
                id: true,
                ticketNumber: true,
                deviceModel: true,
                deviceBrand: true,
                promisedAt: true
            }
        });

        return repairs;
    } catch (error) {
        console.error("Error checking deadlines:", error);
        return [];
    }
}

export async function extendRepairTime(repairId: string, technicianId: string, minutes: number = 15) {
    try {
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: { customer: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        const oldPromisedAt = repair.promisedAt;
        const newPromisedAt = new Date(oldPromisedAt.getTime() + minutes * 60000);

        await db.repair.update({
            where: { id: repairId },
            data: {
                promisedAt: newPromisedAt
            }
        });

        // Notify Vendor/Creator
        const technician = await db.user.findUnique({ where: { id: technicianId } });

        if (repair.userId && technician) {
            const dateStr = newPromisedAt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            const timeStr = newPromisedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            await createNotificationAction({
                userId: repair.userId,
                title: "Fecha Prometida Extendida",
                message: `El téc. ${technician.name} extendió ${minutes} min la reparación #${repair.ticketNumber} (${repair.deviceModel}). Nueva fecha: ${dateStr} ${timeStr}.`,
                type: "WARNING",
                link: `/vendor/repairs/active`
            });
        }

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        return { success: true };

    } catch (error) {
        console.error("Error extending time:", error);
        return { success: false, error: "Error al extender tiempo" };
    }
}
