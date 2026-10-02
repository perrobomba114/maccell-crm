"use server";

import { db } from "@/lib/db";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";
import { recordExternalPurchases } from "@/lib/repairs/record-external-purchases";
import { externalPurchasesSchema, EXTERNAL_PURCHASE_EDITABLE_STATUSES, type ExternalPurchaseInput } from "@/lib/repairs/external-purchases";
import { consumeRepairParts } from "@/lib/repairs/consume-repair-parts";

export async function createSinglePartReturnAction(repairPartId: string, technicianId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "TECHNICIAN" || currentUser.id !== technicianId) {
            return { success: false, error: "No autorizado" };
        }

        const repairPart = await db.repairPart.findUnique({
            where: { id: repairPartId },
            include: {
                sparePart: true,
                repair: {
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                ticketPrefix: true
                            }
                        }
                    }
                }
            }
        });

        if (!repairPart || !repairPart.repair) {
            return { success: false, error: "Repuesto no encontrado en la reparación." };
        }

        const repair = repairPart.repair;
        if (repair.assignedUserId !== technicianId) {
            return { success: false, error: "No tienes asignada esta reparación." };
        }

        const partsSnapshot = [{
            id: repairPart.id,
            sparePartId: repairPart.sparePartId,
            quantity: repairPart.quantity,
            name: repairPart.sparePart.name,
            sku: repairPart.sparePart.sku
        }];

        const returnRequest = await db.$transaction(async (tx) => {
            const createdReturnRequest = await tx.returnRequest.create({
                data: {
                    repairId: repair.id,
                    technicianId: technicianId,
                    technicianNote: `Devolución rápida desde reparación activa #${repair.ticketNumber}`,
                    status: "PENDING",
                    partsSnapshot: partsSnapshot
                }
            });

            await tx.repairPart.delete({
                where: { id: repairPartId }
            });

            return createdReturnRequest;
        });

        const admins = await db.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true }
        });

        const techName = (await db.user.findUnique({ where: { id: technicianId }, select: { name: true } }))?.name || "Técnico";

        await Promise.all(admins.map((admin) =>
            createNotificationAction({
                userId: admin.id,
                title: "Devolución de Repuesto (Inmediata)",
                message: `${techName} devolvió ${repairPart.sparePart.name} de la reparación #${repair.ticketNumber}.`,
                type: "ACTION_REQUEST",
                actionData: {
                    type: "RETURN_REQUEST",
                    returnRequestId: returnRequest.id,
                    repairId: repair.id,
                    branchId: repair.branchId,
                    branchName: repair.branch.name,
                    ticketNumber: repair.ticketNumber,
                    technicianName: techName,
                    partsCount: partsSnapshot.length
                },
                link: "/admin/returns"
            })
        ));

        revalidatePath("/technician/repairs");
        return { success: true };

    } catch (error) {
        console.error("Error creating single part return:", error);
        return { success: false, error: "Error al procesar la devolución." };
    }
}

export async function addPartToRepairAction(repairId: string, technicianId: string, parts: { id: string, name: string }[], externalPurchases: ExternalPurchaseInput[] = []) {
    try {
        if ((!parts || parts.length === 0) && externalPurchases.length === 0) {
            return { success: false, error: "No se seleccionaron repuestos." };
        }

        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "TECHNICIAN" || currentUser.id !== technicianId) {
            return { success: false, error: "No autorizado" };
        }

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { assignedUserId: true, branchId: true, ticketNumber: true, statusId: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId !== technicianId) {
            return { success: false, error: "No tienes asignada esta reparación" };
        }

        const parsed = externalPurchasesSchema.safeParse(externalPurchases);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

        await db.$transaction(async (tx) => {
            const locked = await tx.repair.updateMany({
                where: { id: repairId, assignedUserId: currentUser.id, statusId: { in: EXTERNAL_PURCHASE_EDITABLE_STATUSES } },
                data: { updatedAt: new Date() },
            });
            if (locked.count !== 1) throw new Error("La reparación ya está cerrada o cambió de técnico.");
            await recordExternalPurchases(tx, repairId, currentUser.id, parsed.data);
            await consumeRepairParts(tx, {
                repairId,
                ticketNumber: repair.ticketNumber,
                actorUserId: currentUser.id,
                branchId: repair.branchId,
                parts,
                reason: "Agregado manual",
            });
        });

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        revalidatePath("/admin/repuestos/compras-externas");
        return { success: true };

    } catch (error) {
        console.error("Error adding parts:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al agregar repuestos." };
    }
}
