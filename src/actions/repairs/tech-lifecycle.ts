"use server";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { businessHoursService } from "@/lib/services/business-hours";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import { REPAIR_STATUS } from "@/lib/repairs/status";

export async function startRepairAction(repairId: string, technicianId: string, newEstimatedTime?: number) {
    try {
        const repair = await db.repair.findUnique({ where: { id: repairId } });
        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId !== technicianId) {
            return { success: false, error: "No tienes asignada esta reparación" };
        }

        const now = new Date();
        const dataToUpdate: Prisma.RepairUpdateInput = {
            status: { connect: { id: REPAIR_STATUS.IN_PROGRESS } },
            startedAt: now,
            statusHistory: {
                create: {
                    fromStatusId: repair.statusId,
                    toStatusId: REPAIR_STATUS.IN_PROGRESS,
                    userId: technicianId
                }
            }
        };

        const estimatedMinutes = newEstimatedTime || repair.estimatedTime || 60; // Fallback 60
        if (newEstimatedTime) {
            dataToUpdate.estimatedTime = newEstimatedTime;
        }

        const newPromisedAt = businessHoursService.addBusinessMinutes(now, estimatedMinutes);

        let dateUpdated = false;
        if (!repair.promisedAt || newPromisedAt > repair.promisedAt) {
            dataToUpdate.promisedAt = newPromisedAt;
            dateUpdated = true;
        }

        await db.repair.update({
            where: { id: repairId },
            data: dataToUpdate
        });

        const technician = await db.user.findUnique({ where: { id: technicianId } });
        if (technician) {
            const finalPromisedAt = dateUpdated ? newPromisedAt : repair.promisedAt;
            const dateStr = finalPromisedAt!.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            const timeStr = finalPromisedAt!.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            const msgBody = dateUpdated
                ? `Nueva fecha prometida: ${dateStr} a las ${timeStr}.`
                : `Se mantiene fecha prometida: ${dateStr} a las ${timeStr}.`;

            await createNotificationAction({
                userId: repair.userId,
                title: "Reparación Iniciada",
                message: `El téc. ${technician.name} inició la reparación #${repair.ticketNumber}. ${msgBody}`,
                type: "INFO",
                link: `/vendor/repairs/active`
            });
        }

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        return { success: true };

    } catch (error) {
        console.error("Error starting repair:", error);
        return { success: false, error: "Error al iniciar reparación" };
    }
}

export async function pauseRepairAction(repairId: string, technicianId: string) {
    try {
        const repair = await db.repair.findUnique({ where: { id: repairId } });
        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId !== technicianId) {
            return { success: false, error: "No tienes asignada esta reparación" };
        }

        let remainingMinutes = repair.estimatedTime || 0;
        if (repair.startedAt) {
            const elapsedMs = new Date().getTime() - new Date(repair.startedAt).getTime();
            const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
            remainingMinutes = Math.max(0, (repair.estimatedTime || 0) - elapsedMinutes);
        }

        const oldStatusId = repair.statusId;

        await db.repair.update({
            where: { id: repairId },
            data: {
                status: { connect: { id: REPAIR_STATUS.PAUSED } },
                startedAt: null,
                estimatedTime: remainingMinutes,
                statusHistory: {
                    create: {
                        fromStatusId: oldStatusId,
                        toStatusId: REPAIR_STATUS.PAUSED,
                        userId: technicianId
                    }
                }
            }
        });

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        return { success: true };

    } catch (error) {
        console.error("Error pausing repair:", error);
        return { success: false, error: "Error al pausar reparación" };
    }
}
