"use server";

import { db } from "@/lib/db";
import { businessHoursService } from "@/lib/services/business-hours";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";
import { REPAIR_STATUS } from "@/lib/repairs/status";

export async function techTakeRepairAction(repairId: string, technicianId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "TECHNICIAN" || currentUser.id !== technicianId) {
            return { success: false, error: "No autorizado" };
        }
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { id: true, statusId: true, assignedUserId: true }
        });
        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.statusId !== REPAIR_STATUS.PENDING || repair.assignedUserId) {
            return { success: false, error: "La reparación ya fue retirada o asignada" };
        }

        await db.$transaction(async (tx) => {
            const withdrawn = await tx.repair.updateMany({
                where: {
                    id: repairId,
                    statusId: REPAIR_STATUS.PENDING,
                    assignedUserId: null,
                },
                data: {
                    statusId: REPAIR_STATUS.CLAIMED,
                    assignedUserId: null,
                }
            });
            if (withdrawn.count !== 1) {
                throw new Error("La reparación ya fue retirada o asignada");
            }

            await tx.repairStatusHistory.create({
                data: {
                    repairId,
                    fromStatusId: REPAIR_STATUS.PENDING,
                    toStatusId: REPAIR_STATUS.CLAIMED,
                    userId: technicianId,
                }
            });
        });

        revalidatePath("/technician/tickets");
        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error taking repair:", error);
        return { success: false, error: "Error al retirar reparación" };
    }
}

export async function assignTimeAction(repairId: string, technicianId: string, estimatedTime: number, updatePromisedDate: boolean = false, parts: { id: string, name: string }[] = []) {
    if (!estimatedTime || estimatedTime <= 0) {
        return { success: false, error: "El tiempo estimado es inválido." };
    }

    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "TECHNICIAN" || currentUser.id !== technicianId) {
            return { success: false, error: "No autorizado" };
        }

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: { customer: true }
        });

        if (!repair) {
            return { success: false, error: "Reparación no encontrada" };
        }

        if (repair.assignedUserId && repair.assignedUserId !== technicianId) {
            return { success: false, error: "Esta reparación está asignada a otro técnico." };
        }

        const now = new Date();
        let newPromisedAt: Date | null = null;
        let availableMinutes = 0;

        if (updatePromisedDate) {
            newPromisedAt = businessHoursService.addBusinessMinutes(now, estimatedTime);
        } else {
            availableMinutes = businessHoursService.calculateBusinessMinutes(now, repair.promisedAt);

            if (estimatedTime > availableMinutes) {
                return {
                    success: false,
                    error: `El tiempo estimado (${estimatedTime} min) supera el tiempo disponible (${availableMinutes} min). Seleccione "Actualizar Fecha Prometida" para continuar.`
                };
            }
        }

        const isReactivation = repair.statusId === 7 || repair.statusId === 8 || repair.statusId === 9;
        const targetStatusId = (updatePromisedDate || isReactivation) ? 3 : 4;

        await db.$transaction(async (tx) => {
            const assigned = await tx.repair.updateMany({
                where: {
                    id: repairId,
                    statusId: repair.statusId,
                    assignedUserId: repair.assignedUserId,
                },
                data: {
                    statusId: targetStatusId,
                    assignedUserId: technicianId,
                    estimatedTime: estimatedTime,
                    startedAt: targetStatusId === 3 ? new Date() : undefined,
                    finishedAt: null,
                    ...(newPromisedAt ? { promisedAt: newPromisedAt } : {}),
                }
            });
            if (assigned.count !== 1) {
                throw new Error("La reparación ya fue asignada o cambió de estado.");
            }

            await tx.repairStatusHistory.create({
                data: {
                    repairId,
                    fromStatusId: repair.statusId,
                    toStatusId: targetStatusId,
                    userId: technicianId,
                }
            });

            if (parts.length > 0) {
                for (const part of parts) {
                    const sparePart = await tx.sparePart.findUnique({
                        where: { id: part.id },
                        select: { stockLocal: true }
                    });
                    if (!sparePart || sparePart.stockLocal < 1) {
                        throw new Error(`Sin stock suficiente para el repuesto: ${part.name}`);
                    }

                    await tx.repairPart.create({
                        data: {
                            repairId,
                            sparePartId: part.id,
                            quantity: 1
                        }
                    });

                    await tx.sparePart.update({
                        where: { id: part.id },
                        data: {
                            stockLocal: { decrement: 1 }
                        }
                    });

                    if (currentUser && currentUser.branch) {
                        await tx.sparePartHistory.create({
                            data: {
                                sparePartId: part.id,
                                userId: technicianId,
                                branchId: currentUser.branch.id,
                                quantity: -1,
                                reason: `Reparación #${repair.ticketNumber} (Asignación de tiempo/repuestos)`,
                                isChecked: false
                            }
                        });
                    }
                }
            }
        });

        const technician = await db.user.findUnique({ where: { id: technicianId } });
        if (technician) {
            let message = `El técnico ${technician.name} ha asignado un tiempo de ${estimatedTime} min a la reparación #${repair.ticketNumber}.`;

            if (newPromisedAt) {
                const dateStr = newPromisedAt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                const timeStr = newPromisedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                message += ` Se ha actualizado la fecha prometida a: ${dateStr} ${timeStr}.`;
            }

            if (parts.length > 0) {
                message += ` Se agregaron repuestos: ${parts.map(p => p.name).join(", ")}.`;
            }

            await createNotificationAction({
                userId: repair.userId, 
                title: updatePromisedDate ? "Planificación Actualizada" : "Reparación Planificada",
                message: message,
                type: "INFO",
                link: `/vendor/repairs/active`
            });
        }

        revalidatePath("/", "layout");
        return { success: true };

    } catch (error) {
        console.error("Error assigning time:", error);
        return { success: false, error: "Error interno" };
    }
}

export async function transferRepairAction(repairId: string, fromTechId: string, toTechId: string) {
    try {
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: { customer: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };
        if (repair.assignedUserId !== fromTechId) {
            return { success: false, error: "No tienes permiso para transferir esta reparación" };
        }

        const [fromTech, toTech] = await Promise.all([
            db.user.findUnique({ where: { id: fromTechId }, select: { name: true } }),
            db.user.findUnique({ where: { id: toTechId }, select: { name: true } })
        ]);

        if (!toTech) return { success: false, error: "Técnico receptor no encontrado" };

        await db.repair.update({
            where: { id: repairId },
            data: {
                assignedUserId: toTechId,
            }
        });

        await createNotificationAction({
            userId: toTechId,
            title: "Reparación Transferida",
            message: `El técnico ${fromTech?.name || "un colega"} te ha transferido la reparación #${repair.ticketNumber}.`,
            type: "INFO",
            link: `/technician/repairs`
        });

        if (repair.userId) {
            await createNotificationAction({
                userId: repair.userId,
                title: "Cambio de Técnico",
                message: `La reparación #${repair.ticketNumber} ha sido transferida de ${fromTech?.name} a ${toTech.name}.`,
                type: "INFO",
                link: `/vendor/repairs/active`
            });
        }

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        revalidatePath("/vendor/repairs/active");

        return { success: true };
    } catch (error) {
        console.error("Error transferring repair:", error);
        return { success: false, error: "Error al realizar la transferencia" };
    }
}
