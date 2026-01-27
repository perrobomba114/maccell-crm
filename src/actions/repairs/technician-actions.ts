"use server";

import { db } from "@/lib/db";
import { businessHoursService } from "@/lib/services/business-hours";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";

// Status IDs:
// 2: Tomado por Técnico (Claimed)
// 4: Pausado (Time Assigned / Planned)
// 3: En Proceso (Started)
// 5-9: Final states

export async function takeRepairAction(repairId: string, technicianId: string) {
    try {
        const repair = await db.repair.findUnique({ where: { id: repairId } });
        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId) {
            return { success: false, error: "Ya está asignada" };
        }

        // 1. takeRepairAction: REMOVE assignedUserId
        await db.repair.update({
            where: { id: repairId },
            data: {
                // assignedUserId: technicianId, // REMOVED as per request
                statusId: 2 // Tomado por Técnico
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
    console.log("assignTimeAction CALLED", { repairId, technicianId, estimatedTime, updatePromisedDate, parts });

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

        // Allow if assigned to me OR if unassigned (and I'm taking it now)
        if (repair.assignedUserId && repair.assignedUserId !== technicianId) {
            return { success: false, error: "Esta reparación está asignada a otro técnico." };
        }

        const now = new Date();
        let newPromisedAt: Date | null = null;
        let availableMinutes = 0;

        // If explicitly updating date (Recalculating from NOW based on Estimate)
        if (updatePromisedDate) {
            newPromisedAt = businessHoursService.addBusinessMinutes(now, estimatedTime);
            console.log("Recalculating Date:", { now, estimatedTime, newPromisedAt });
        } else {
            // Standard validation against EXISTING date
            availableMinutes = businessHoursService.calculateBusinessMinutes(now, repair.promisedAt);

            // Allow slight buffer (e.g. 1-2 mins) or just strict
            if (estimatedTime > availableMinutes) {
                return {
                    success: false,
                    error: `El tiempo estimado (${estimatedTime} min) supera el tiempo disponible (${availableMinutes} min). Seleccione "Actualizar Fecha Prometida" para continuar.`
                };
            }
        }

        // Update Repair
        // Update Repair using direct IDs for robustness
        // calculate Reactivation
        const isReactivation = repair.statusId === 7 || repair.statusId === 8 || repair.statusId === 9;
        const targetStatusId = (updatePromisedDate || isReactivation) ? 3 : 4;

        await db.$transaction(async (tx) => {
            await tx.repair.update({
                where: { id: repairId },
                data: {
                    statusId: targetStatusId,
                    assignedUserId: technicianId,
                    estimatedTime: estimatedTime,
                    // Explicitly set startedAt if status is 3
                    startedAt: targetStatusId === 3 ? new Date() : undefined,
                    // CRITICAL FIX: Clear finishedAt because we are reopening the repair
                    finishedAt: null,
                    ...(newPromisedAt ? { promisedAt: newPromisedAt } : {})
                }
            });

            // Handle New Parts
            if (parts.length > 0) {
                for (const part of parts) {
                    await tx.repairPart.create({
                        data: {
                            repairId,
                            sparePartId: part.id,
                            quantity: 1
                        }
                    });

                    // Decrement stock
                    await tx.sparePart.update({
                        where: { id: part.id },
                        data: {
                            stockLocal: { decrement: 1 }
                        }
                    });
                }
            }
        });

        // Notify Vendor/Creator
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
                userId: repair.userId, // Customer or Vendor checking
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

export async function startRepairAction(repairId: string, technicianId: string, newEstimatedTime?: number) {
    try {
        const repair = await db.repair.findUnique({ where: { id: repairId } });
        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId !== technicianId) {
            return { success: false, error: "No tienes asignada esta reparación" };
        }

        const now = new Date();
        const dataToUpdate: any = {
            status: { connect: { id: 3 } }, // En Proceso
            startedAt: now
        };

        const estimatedMinutes = newEstimatedTime || repair.estimatedTime || 60; // Fallback 60
        if (newEstimatedTime) {
            dataToUpdate.estimatedTime = newEstimatedTime;
        }

        // Recalculate Promised Date
        // Logic: Promise = Now + Remaining Estimated Time (Business Hours)
        // If repair was paused, estimatedTime holds remaining minutes.
        const newPromisedAt = businessHoursService.addBusinessMinutes(now, estimatedMinutes);

        // CONDITIONAL UPDATE: Only extend if new date > current promised date
        // This preserves the original promise if the technician is faster/earlier.
        let dateUpdated = false;
        if (!repair.promisedAt || newPromisedAt > repair.promisedAt) {
            dataToUpdate.promisedAt = newPromisedAt;
            dateUpdated = true;
        }

        await db.repair.update({
            where: { id: repairId },
            data: dataToUpdate
        });

        // Notify Vendor/Creator
        const technician = await db.user.findUnique({ where: { id: technicianId } });
        if (technician) {
            // Determine which date to show in notification
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

        // Calculate remaining time
        let remainingMinutes = repair.estimatedTime || 0;
        if (repair.startedAt) {
            const elapsedMs = new Date().getTime() - new Date(repair.startedAt).getTime();
            const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
            remainingMinutes = Math.max(0, (repair.estimatedTime || 0) - elapsedMinutes);
        }

        await db.repair.update({
            where: { id: repairId },
            data: {
                status: { connect: { id: 4 } }, // Pausado
                startedAt: null, // Clear startedAt since it's paused
                estimatedTime: remainingMinutes // Persist the remaining time
            } as any
        });

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        return { success: true };

    } catch (error) {
        console.error("Error pausing repair:", error);
        return { success: false, error: "Error al pausar reparación" };
    }
}

// ... imports
// We need saveRepairImages
import { saveRepairImages } from "@/lib/actions/upload";

// ... existing actions

export async function finishRepairAction(formData: FormData) {
    console.log("SERVER ACTION: finishRepairAction hit");
    try {
        // Extract data
        const repairId = formData.get("repairId") as string;
        const technicianId = formData.get("technicianId") as string;
        const statusIdRaw = formData.get("statusId");
        const diagnosis = formData.get("diagnosis") as string;
        const createReturnRequest = formData.get("createReturnRequest") === "true";
        const isWet = formData.get("isWet") === "true";


        console.log("finishRepairAction:", { repairId, technicianId, statusIdRaw });

        if (!repairId || !technicianId || !statusIdRaw) {
            console.error("Missing fields in finishRepairAction");
            return { success: false, error: "Faltan datos requeridos" };
        }

        const statusId = parseInt(statusIdRaw as string);
        if (isNaN(statusId)) {
            return { success: false, error: "ID de estado inválido" };
        }

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: {
                id: true,
                ticketNumber: true,
                assignedUserId: true,
                userId: true,
                deviceImages: true,
                startedAt: true,
                estimatedTime: true,
                parts: {
                    include: {
                        sparePart: true
                    }
                }
            }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId !== technicianId) {
            return { success: false, error: "No tienes asignada esta reparación" };
        }

        if (![4, 5, 6, 7, 8, 9, 10].includes(statusId)) {
            return { success: false, error: "Estado final inválido" };
        }

        // Handle Images
        const currentImages = repair.deviceImages || [];
        let newImages: string[] = [];
        try {
            newImages = await saveRepairImages(formData, repair.ticketNumber, currentImages.length);
        } catch (imgError) {
            console.error("Error saving images:", imgError);
        }

        // PREPARE UPDATE DATA
        const dataToUpdate: any = {
            statusId: statusId,
            diagnosis: diagnosis,
            deviceImages: [...currentImages, ...newImages].filter(img => img && img.length > 5 && img.includes('/') && !img.includes('undefined') && !img.includes('null'))
        };

        // If Pausing (Status 4) -> Calculate Remaining Time
        if (statusId === 4) {
            let remainingMinutes = repair.estimatedTime || 0;
            if (repair.startedAt) {
                const elapsedMs = new Date().getTime() - new Date(repair.startedAt).getTime();
                const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
                remainingMinutes = Math.max(0, (repair.estimatedTime || 0) - elapsedMinutes);
            }
            dataToUpdate.estimatedTime = remainingMinutes;
            dataToUpdate.startedAt = null; // Clear startedAt
            // Do NOT set finishedAt
        } else {
            // Finalizing states (5, 6, 7...)
            dataToUpdate.finishedAt = new Date();
        }

        dataToUpdate.isWet = isWet; // Always update isWet based on technician input

        await db.repair.update({
            where: { id: repairId },
            data: dataToUpdate
        });

        // Notify Vendor
        try {
            const [technician, newStatus] = await Promise.all([
                db.user.findUnique({ where: { id: technicianId } }),
                db.repairStatus.findUnique({ where: { id: statusId } })
            ]);

            if (technician && newStatus && repair.userId) {
                await createNotificationAction({
                    userId: repair.userId,
                    title: "Actualización de Reparación",
                    message: `El técnico ${technician.name} ha cambiado el estado del ticket #${repair.ticketNumber} a "${newStatus.name}".`,
                    type: "INFO",
                    link: `/vendor/repairs/active`
                });
            }
        } catch (notifError) {
            console.error("Error sending notification:", notifError);
        }

        // Handle Return Request (Selective)
        const returnPartIdsStr = formData.get("returnPartIds") as string;
        let returnPartIds: string[] = [];
        try {
            if (returnPartIdsStr) {
                returnPartIds = JSON.parse(returnPartIdsStr);
            }
        } catch (e) {
            console.error("Error parsing returnPartIds", e);
        }

        if (returnPartIds.length > 0) {
            let partsSnapshot: any[] = [];

            if (repair.parts && Array.isArray(repair.parts)) {
                try {
                    // Filter parts that match the return IDs
                    // And format them for the snapshot
                    partsSnapshot = repair.parts
                        .filter((p: any) => returnPartIds.includes(p.id))
                        .map((p: any) => {
                            if (!p.sparePart) return null;
                            return {
                                id: p.id,
                                sparePartId: p.sparePartId,
                                quantity: p.quantity,
                                name: p.sparePart.name,
                                sku: p.sparePart.sku
                            };
                        })
                        .filter((p: any) => p !== null);
                } catch (snapError) {
                    console.error("Error creating parts snapshot:", snapError);
                }
            }

            if (partsSnapshot.length > 0) {
                await db.returnRequest.create({
                    data: {
                        repairId,
                        technicianId,
                        technicianNote: `${diagnosis} (Devolución parcial de repuestos)`,
                        status: "PENDING",
                        partsSnapshot: partsSnapshot
                    } as any
                });

                // Notify Admins
                const admins = await db.user.findMany({
                    where: { role: "ADMIN" },
                    select: { id: true }
                });

                const techName = (await db.user.findUnique({ where: { id: technicianId }, select: { name: true } }))?.name || "Técnico";

                await Promise.all(admins.map((admin: any) =>
                    createNotificationAction({
                        userId: admin.id,
                        title: "Nueva Devolución de Repuestos",
                        message: `${techName} ha solicitado devolver ${partsSnapshot.length} repuestos de la reparación #${repair.ticketNumber}.`,
                        type: "INFO",
                        link: "/admin/returns"
                    })
                ));
            }
        }


        revalidatePath("/technician/repairs");
        revalidatePath("/admin/repairs"); // Also valid for admin
        revalidatePath("/technician/dashboard");
        return { success: true };

    } catch (error) {
        console.error("Error finishing repair (CRITICAL):", error);
        return { success: false, error: "Error al finalizar reparación (Ver consola)" };
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
                // Optional: Keep it in process (3) or reset to paused (4)
                // Let's keep it in "Started" if it was, but reset timers or just hand over.
                // Re-setting to Status 2 (Taken) might be safer so the new tech "accepts" it with their time?
                // Actually user said "Transferir" so reassigning and keeping everything is fine.
            }
        });

        // Notify New Technician
        await createNotificationAction({
            userId: toTechId,
            title: "Reparación Transferida",
            message: `El técnico ${fromTech?.name || "un colega"} te ha transferido la reparación #${repair.ticketNumber}.`,
            type: "INFO",
            link: `/technician/repairs`
        });

        // Notify Creator/Vendor
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
