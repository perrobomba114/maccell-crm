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

export async function assignTimeAction(repairId: string, technicianId: string, estimatedTime: number, extendMinutes?: number) {
    console.log("assignTimeAction CALLED", { repairId, technicianId, estimatedTime, extendMinutes }); // DEBUG
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

        // Validate Business Hours
        const now = new Date();
        let targetDate = repair.promisedAt;
        let newPromisedAt: Date | null = null;

        console.log("Time Check Start:", { now, originalPromisedAt: repair.promisedAt, isOverdue: now > repair.promisedAt }); // DEBUG

        // If extending, calculate new target date
        if (extendMinutes && extendMinutes > 0) {
            // Logic similar to take-repair-dialog: start from NOW if overdue
            const baseDate = now > repair.promisedAt ? now : repair.promisedAt;
            targetDate = businessHoursService.addBusinessMinutes(baseDate, extendMinutes);
            newPromisedAt = targetDate;
            console.log("Extension Applied:", { extendMinutes, baseDate, newTargetDate: targetDate }); // DEBUG
        } else if (now > repair.promisedAt) {
            // Fail-safe: Auto-extend by 60 mins if overdue and no extension requested (e.g. old client)
            console.log("Auto-extending overdue repair (Fail-safe triggered)");
            const baseDate = now;
            targetDate = businessHoursService.addBusinessMinutes(baseDate, 60);
            newPromisedAt = targetDate;
        }

        const availableMinutes = businessHoursService.calculateBusinessMinutes(now, targetDate);
        console.log("Availability Result:", { availableMinutes, estimatedTime }); // DEBUG

        if (estimatedTime > availableMinutes) {
            return {
                success: false,
                error: `El tiempo estimado (${estimatedTime} min) supera el tiempo disponible (${availableMinutes} min).`
            };
        }

        // Update Repair
        await db.repair.update({
            where: { id: repairId },
            data: {
                status: { connect: { id: 4 } }, // Pausado (Ready/Planned)
                assignedTo: { connect: { id: technicianId } }, // NOW we assign it
                estimatedTime: estimatedTime,
                ...(newPromisedAt ? { promisedAt: newPromisedAt } : {})
            } as any
        });

        // Notify Vendor/Creator
        const technician = await db.user.findUnique({ where: { id: technicianId } });
        if (technician) {
            let message = `El técnico ${technician.name} ha asignado un tiempo de ${estimatedTime} min a la reparación #${repair.ticketNumber}.`;
            if (newPromisedAt) {
                message += ` Se ha extendido la fecha prometida a ${newPromisedAt.toLocaleDateString('es-AR')} ${newPromisedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.`;
            }

            await createNotificationAction({
                userId: repair.userId, // Creator
                title: "Reparación Planificada",
                message: message,
                type: "INFO",
                link: `/vendor/repairs/active`
            });
        }

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
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
        dataToUpdate.promisedAt = newPromisedAt;

        await db.repair.update({
            where: { id: repairId },
            data: dataToUpdate
        });

        // Notify Vendor/Creator
        const technician = await db.user.findUnique({ where: { id: technicianId } });
        if (technician) {
            const dateStr = newPromisedAt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            const timeStr = newPromisedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            await createNotificationAction({
                userId: repair.userId,
                title: "Reparación Iniciada / Fecha Actualizada",
                message: `El téc. ${technician.name} inició la reparación #${repair.ticketNumber}. Nueva fecha prometida: ${dateStr} a las ${timeStr}.`,
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
            deviceImages: [...currentImages, ...newImages]
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

        // Handle Return Request
        if (createReturnRequest) {
            let partsSnapshot: any[] = [];

            if (repair.parts && Array.isArray(repair.parts)) {
                try {
                    partsSnapshot = repair.parts.map(p => {
                        if (!p.sparePart) return null;
                        return {
                            id: p.id,
                            sparePartId: p.sparePartId,
                            quantity: p.quantity,
                            name: p.sparePart.name,
                            sku: p.sparePart.sku
                        };
                    }).filter(p => p !== null);
                } catch (snapError) {
                    console.error("Error creating parts snapshot:", snapError);
                    // Continue without snapshot or partial
                }
            }

            await db.returnRequest.create({
                data: {
                    repairId,
                    technicianId,
                    technicianNote: diagnosis,
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

            await Promise.all(admins.map(admin =>
                createNotificationAction({
                    userId: admin.id,
                    title: "Nueva Solicitud de Devolución",
                    message: `${techName} ha solicitado devolver repuestos de la reparación #${repair.ticketNumber}.`,
                    type: "INFO",
                    link: "/admin/returns"
                })
            ));

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
