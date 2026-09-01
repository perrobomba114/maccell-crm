"use server";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import { saveRepairImages } from "@/lib/actions/upload";
import { isReactivatableRepair } from "@/lib/repairs/reactivation-policy";
import { REPAIR_STATUS } from "@/lib/repairs/status";
import { VENDOR_REACTIVATABLE_STATUS_IDS } from "@/lib/repairs/status-sets";

export async function finishRepairAction(formData: FormData) {
    try {
        const repairId = formData.get("repairId") as string;
        const technicianId = formData.get("technicianId") as string;
        const statusIdRaw = formData.get("statusId");
        const diagnosis = formData.get("diagnosis") as string;
        const createReturnRequest = formData.get("createReturnRequest") === "true";
        const isWet = formData.get("isWet") === "true";
        const hasSimCard = formData.get("hasSimCard") === "true";
        const hasMemoryCard = formData.get("hasMemoryCard") === "true";

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

        const allowedFinalStatuses = [
            REPAIR_STATUS.PAUSED,
            REPAIR_STATUS.OK,
            REPAIR_STATUS.NO_REPAIR,
            ...VENDOR_REACTIVATABLE_STATUS_IDS,
            REPAIR_STATUS.DELIVERED,
        ];
        if (!allowedFinalStatuses.includes(statusId as (typeof allowedFinalStatuses)[number])) {
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
        const dataToUpdate: Prisma.RepairUpdateInput = {
            status: { connect: { id: statusId } },
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

        if (statusId === REPAIR_STATUS.PAUSED) {
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
        dataToUpdate.hasSimCard = hasSimCard;
        dataToUpdate.hasMemoryCard = hasMemoryCard;

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
                const isVendorFollowUpStatus = isReactivatableRepair(statusId);
                await createNotificationAction({
                    userId: repair.userId,
                    title: isVendorFollowUpStatus ? "Reparación requiere gestión" : "Actualización de Reparación",
                    message: `El técnico ${technician.name} ha cambiado el estado del ticket #${repair.ticketNumber} a "${newStatus.name}".`,
                    type: "INFO",
                    link: isVendorFollowUpStatus ? `/vendor/repairs/history` : `/vendor/repairs/active`
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

        if (statusId === REPAIR_STATUS.NO_REPAIR && repair.parts && repair.parts.length > 0) {
            const allPartIds = repair.parts.map((part) => part.id);
            returnPartIds = Array.from(new Set([...returnPartIds, ...allPartIds]));
        }

        if (returnPartIds.length > 0) {
            let partsSnapshot: Array<{
                id: string;
                sparePartId: string;
                quantity: number;
                name: string;
                sku: string;
            }> = [];

            if (repair.parts && Array.isArray(repair.parts)) {
                try {
                    partsSnapshot = repair.parts
                        .filter((part) => returnPartIds.includes(part.id))
                        .map((part) => {
                            return {
                                id: part.id,
                                sparePartId: part.sparePartId,
                                quantity: part.quantity,
                                name: part.sparePart.name,
                                sku: part.sparePart.sku
                            };
                        });
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
                    } satisfies Prisma.ReturnRequestUncheckedCreateInput
                });

                const admins = await db.user.findMany({
                    where: { role: "ADMIN" },
                    select: { id: true }
                });

                const techName = (await db.user.findUnique({ where: { id: technicianId }, select: { name: true } }))?.name || "Técnico";

                await Promise.all(admins.map((admin) =>
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

        return { success: true };

    } catch (error) {
        console.error("Error finishing repair (CRITICAL):", error);
        return { success: false, error: "Error al finalizar reparación (Ver consola)" };
    }
}
