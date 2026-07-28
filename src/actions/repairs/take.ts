"use server";

import { db } from "@/lib/db";
import { businessHoursService } from "@/lib/services/business-hours";
import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/date-utils";
import { es } from "date-fns/locale";
import { createNotificationAction } from "@/lib/actions/notifications";
import { getCurrentUser } from "@/actions/auth-actions";
import { REPAIR_STATUS } from "@/lib/repairs/status";

export async function takeRepairAction(
    repairId: string,
    userId: string,
    parts: { id: string, name: string }[],
    extendMinutes?: number
) {
    if (!repairId || !userId) return { success: false, error: "Datos incompletos" };

    try {
        let newPromisedAt: Date | null = null;
        let creatorUserId: string | null = null;
        let ticketNumberValue: string = "";

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { userId: true, ticketNumber: true, promisedAt: true, branchId: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };
        creatorUserId = repair.userId;
        ticketNumberValue = repair.ticketNumber;

        const currentUser = await getCurrentUser();
        if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.id !== userId)) {
            return { success: false, error: "No autorizado" };
        }
        const branchIdToLog = currentUser?.branch?.id || repair.branchId;

        await db.$transaction(async (tx) => {
            let promisedAtUpdate: Date | undefined;

            if (extendMinutes && extendMinutes > 0) {
                const now = new Date();
                const calculatedDate = businessHoursService.addBusinessMinutes(now, extendMinutes);
                promisedAtUpdate = calculatedDate;
                newPromisedAt = calculatedDate;
            }

            const withdrawn = await tx.repair.updateMany({
                where: {
                    id: repairId,
                    statusId: REPAIR_STATUS.PENDING,
                    assignedUserId: null,
                },
                data: {
                    statusId: REPAIR_STATUS.CLAIMED,
                    assignedUserId: null,
                    ...(promisedAtUpdate ? { promisedAt: promisedAtUpdate } : {}),
                }
            });
            if (withdrawn.count !== 1) {
                throw new Error("La reparación ya fue retirada o asignada.");
            }

            await tx.repairStatusHistory.create({
                data: {
                    repairId,
                    fromStatusId: REPAIR_STATUS.PENDING,
                    toStatusId: REPAIR_STATUS.CLAIMED,
                    userId,
                }
            });

            if (parts.length > 0) {
                for (const part of parts) {
                    await tx.repairPart.create({
                        data: {
                            repairId,
                            sparePartId: part.id,
                            quantity: 1
                        }
                    });

                    const partStock = await tx.sparePart.findUnique({
                        where: { id: part.id },
                        select: { stockLocal: true }
                    });
                    if (!partStock || partStock.stockLocal < 1) {
                        throw new Error(`Sin stock suficiente para el repuesto: ${part.name}`);
                    }

                    await tx.sparePart.update({
                        where: { id: part.id },
                        data: {
                            stockLocal: { decrement: 1 }
                        }
                    });

                    if (currentUser && branchIdToLog) {
                        await tx.sparePartHistory.create({
                            data: {
                                sparePartId: part.id,
                                userId: userId, 
                                branchId: branchIdToLog,
                                quantity: -1,
                                reason: `Reparación #${ticketNumberValue} (Tomado por técnico)`,
                                isChecked: false
                            }
                        });
                    }
                }
            }

            let obsContent = `Reparación retirada por técnico. Pendiente de asignación.`;
            if (extendMinutes && newPromisedAt) {
                obsContent += ` Fecha prometida actualizada a ${formatInTimeZone(newPromisedAt, TIMEZONE, "dd/MM HH:mm", { locale: es })}.`;
            }
            if (parts.length > 0) {
                obsContent += ` Repuestos: ${parts.map(p => p.name).join(", ")}`;
            }

            await tx.repairObservation.create({
                data: {
                    repairId,
                    userId,
                    content: obsContent
                }
            });
        });

        if (newPromisedAt && creatorUserId) {
            const formattedDate = formatInTimeZone(newPromisedAt, TIMEZONE, "dd/MM HH:mm", { locale: es });
            await createNotificationAction({
                userId: creatorUserId,
                title: `Cambio en Ticket #${ticketNumberValue}`,
                message: `El técnico ha actualizado la fecha prometida a ${formattedDate} (Reparación extendida).`,
                type: "INFO",
                link: `/vendor/repairs/active` 
            });
        }

        revalidatePath("/technician/tickets");
        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        revalidatePath("/admin/repairs"); 
        return { success: true };
    } catch (error) {
        console.error("Take Repair Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al retirar reparación." };
    }
}
