"use server";

import { db } from "@/lib/db";
import { businessHoursService } from "@/lib/services/business-hours";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

export async function techTakeRepairAction(repairId: string, technicianId: string) {
    try {
        const repair = await db.repair.findUnique({ where: { id: repairId } });
        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId) {
            return { success: false, error: "Ya está asignada" };
        }

        await db.repair.update({
            where: { id: repairId },
            data: {
                statusId: 2, 
                statusHistory: {
                    create: {
                        fromStatusId: repair.statusId, 
                        toStatusId: 2,
                        userId: technicianId
                    }
                }
            }
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

        const currentUser = await getCurrentUser();

        await db.$transaction(async (tx) => {
            await tx.repair.update({
                where: { id: repairId },
                data: {
                    statusId: targetStatusId,
                    assignedUserId: technicianId,
                    estimatedTime: estimatedTime,
                    startedAt: targetStatusId === 3 ? new Date() : undefined,
                    finishedAt: null,
                    ...(newPromisedAt ? { promisedAt: newPromisedAt } : {}),
                    statusHistory: {
                        create: {
                            fromStatusId: repair.statusId,
                            toStatusId: targetStatusId,
                            userId: technicianId
                        }
                    }
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
                        await (tx as any).sparePartHistory.create({
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
