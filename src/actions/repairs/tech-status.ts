"use server";

import { db } from "@/lib/db";
import { businessHoursService } from "@/lib/services/business-hours";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import { indexRepair } from "@/lib/cerebro-indexer";
import { saveRepairImages } from "@/lib/actions/upload";

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
            startedAt: now,
            statusHistory: {
                create: {
                    fromStatusId: repair.statusId,
                    toStatusId: 3,
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
                status: { connect: { id: 4 } }, // Pausado
                startedAt: null, 
                estimatedTime: remainingMinutes, 
                statusHistory: {
                    create: {
                        fromStatusId: oldStatusId,
                        toStatusId: 4,
                        userId: technicianId
                    }
                }
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

export async function finishRepairAction(formData: FormData) {
    try {
        const repairId = formData.get("repairId") as string;
        const technicianId = formData.get("technicianId") as string;
        const statusIdRaw = formData.get("statusId");
        const diagnosis = formData.get("diagnosis") as string;
        const createReturnRequest = formData.get("createReturnRequest") === "true";
        const isWet = formData.get("isWet") === "true";

        if (!repairId || !technicianId || !statusIdRaw) {
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
                statusId: true,
                deviceImages: true,
                startedAt: true,
                finishedAt: true,
                estimatedTime: true,
                parts: {
                    include: { sparePart: true }
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

        const currentImages = repair.deviceImages || [];
        let newImages: string[] = [];
        try {
            newImages = await saveRepairImages(formData, repair.ticketNumber, currentImages.length);
        } catch (imgError) {
            console.error("Error saving images:", imgError);
        }

        const oldRepairStatusId = repair.statusId;
        const dataToUpdate: any = {
            statusId: statusId,
            diagnosis: diagnosis,
            deviceImages: [...currentImages, ...newImages].filter(img => img && img.length > 5 && img.includes('/') && !img.includes('undefined') && !img.includes('null')),
            statusHistory: {
                create: {
                    fromStatusId: oldRepairStatusId,
                    toStatusId: statusId,
                    userId: technicianId
                }
            }
        };

        if (statusId === 4) {
            let remainingMinutes = repair.estimatedTime || 0;
            if (repair.startedAt) {
                const elapsedMs = new Date().getTime() - new Date(repair.startedAt).getTime();
                const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
                remainingMinutes = Math.max(0, (repair.estimatedTime || 0) - elapsedMinutes);
            }
            dataToUpdate.estimatedTime = remainingMinutes;
            dataToUpdate.startedAt = null; 
        } else {
            if (!repair.finishedAt) {
                dataToUpdate.finishedAt = new Date();
            }
        }

        dataToUpdate.isWet = isWet; 

        await db.repair.update({
            where: { id: repairId },
            data: dataToUpdate
        });

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

        const returnPartIdsStr = formData.get("returnPartIds") as string;
        let returnPartIds: string[] = [];
        try {
            if (returnPartIdsStr) {
                returnPartIds = JSON.parse(returnPartIdsStr);
            }
        } catch (e) {
            console.error("Error parsing returnPartIds", e);
        }

        if (statusId === 6 && repair.parts && repair.parts.length > 0) {
            const allPartIds = repair.parts.map((p: any) => p.id);
            returnPartIds = Array.from(new Set([...returnPartIds, ...allPartIds]));
        }

        if (returnPartIds.length > 0) {
            let partsSnapshot: any[] = [];

            if (repair.parts && Array.isArray(repair.parts)) {
                try {
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
                        type: "ACTION_REQUEST",
                        link: "/admin/returns"
                    })
                ));
            }
        }

        revalidatePath("/technician/repairs");
        revalidatePath("/admin/repairs");
        revalidatePath("/technician/dashboard");

        if (diagnosis && [5, 6, 7, 8, 9, 10].includes(statusId)) {
            const fullRepair = await db.repair.findUnique({
                where: { id: repairId },
                include: {
                    observations: { select: { content: true } },
                    parts: { include: { sparePart: { select: { name: true, brand: true } } } },
                }
            });
            if (fullRepair) {
                indexRepair(fullRepair).catch(err =>
                    console.error('[CEREBRO_INDEXER] Error auto-indexando repair:', err.message)
                );
            }
        }

        return { success: true };

    } catch (error) {
        console.error("Error finishing repair (CRITICAL):", error);
        return { success: false, error: "Error al finalizar reparación (Ver consola)" };
    }
}
