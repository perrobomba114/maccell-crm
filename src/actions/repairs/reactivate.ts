"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import { createNotificationAction } from "@/lib/actions/notifications";
import { db } from "@/lib/db";
import { REPAIR_STATUS } from "@/lib/repairs/status";
import { VENDOR_REACTIVATABLE_STATUS_IDS } from "@/lib/repairs/status-sets";
import {
    buildReactivationMutation,
    getReactivationAuthorizationError,
    isReactivatableRepair,
    type RepairReactivationActor,
} from "@/lib/repairs/reactivation-policy";
import { revalidatePath } from "next/cache";

const NOT_REACTIVATABLE_ERROR = "La reparación no está esperando reactivación";

export async function reactivateRepairAction(repairId: string) {
    if (!repairId) return { success: false, error: "Reparación no encontrada" } as const;

    try {
        const caller = await getCurrentUser();
        if (!caller || (caller.role !== "VENDOR" && caller.role !== "ADMIN")) {
            return { success: false, error: "No autorizado" } as const;
        }

        const actor: RepairReactivationActor = {
            id: caller.id,
            name: caller.name,
            role: caller.role,
            branchId: caller.branch?.id ?? null,
        };

        const reactivatedRepair = await db.$transaction(async (tx) => {
            const repair = await tx.repair.findUnique({
                where: { id: repairId },
                select: {
                    id: true,
                    ticketNumber: true,
                    statusId: true,
                    branchId: true,
                    assignedUserId: true,
                    status: { select: { name: true } },
                },
            });

            if (!repair) throw new Error("Reparación no encontrada");

            const authorizationError = getReactivationAuthorizationError(actor, repair);
            if (authorizationError) throw new Error(authorizationError);
            if (!isReactivatableRepair(repair.statusId)) throw new Error(NOT_REACTIVATABLE_ERROR);

            const target = {
                ...repair,
                statusName: repair.status.name,
            };
            const mutation = buildReactivationMutation(target, actor);
            const updated = await tx.repair.updateMany({
                where: {
                    id: repairId,
                    statusId: { in: [...VENDOR_REACTIVATABLE_STATUS_IDS] },
                },
                data: mutation.repair,
            });

            if (updated.count !== 1) throw new Error(NOT_REACTIVATABLE_ERROR);

            await tx.repairStatusHistory.create({
                data: {
                    repairId,
                    ...mutation.history,
                },
            });

            await tx.repairObservation.create({
                data: {
                    repairId,
                    userId: actor.id,
                    content: mutation.observation,
                },
            });

            return {
                ticketNumber: repair.ticketNumber,
                branchId: repair.branchId,
                previousStatusName: repair.status.name,
            };
        });

        try {
            const technicians = await db.user.findMany({
                where: {
                    role: "TECHNICIAN",
                    OR: [
                        { branchId: reactivatedRepair.branchId },
                        { branchId: null },
                    ],
                },
                select: { id: true },
            });

            await Promise.all(technicians.map((technician) => createNotificationAction({
                userId: technician.id,
                title: `Reparación disponible #${reactivatedRepair.ticketNumber}`,
                message: `La reparación fue reactivada por el vendedor desde "${reactivatedRepair.previousStatusName}" y volvió a Ingresado.`,
                type: "REPAIR_ENTRY",
                actionData: {
                    ticketNumber: reactivatedRepair.ticketNumber,
                    previousStatus: reactivatedRepair.previousStatusName,
                },
                link: "/technician/tickets",
            })));
        } catch (notificationError) {
            console.error("Error sending repair reactivation notifications:", notificationError);
        }

        revalidatePath("/technician/tickets");
        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        revalidatePath("/vendor/repairs/active");
        revalidatePath("/vendor/repairs/history");

        return { success: true } as const;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error al reactivar reparación";
        if (message === "No autorizado" || message === NOT_REACTIVATABLE_ERROR || message === "Reparación no encontrada") {
            return { success: false, error: message } as const;
        }
        console.error("Error reactivating repair:", error);
        return { success: false, error: "Error al reactivar reparación" } as const;
    }
}
