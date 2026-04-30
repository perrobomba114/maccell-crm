"use server";

import { db } from "@/lib/db";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

export async function createSinglePartReturnAction(repairPartId: string, technicianId: string) {
    try {
        const repairPart = await db.repairPart.findUnique({
            where: { id: repairPartId },
            include: {
                sparePart: true,
                repair: true
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

        await db.$transaction(async (tx) => {
            await tx.returnRequest.create({
                data: {
                    repairId: repair.id,
                    technicianId: technicianId,
                    technicianNote: `Devolución rápida desde reparación activa #${repair.ticketNumber}`,
                    status: "PENDING",
                    partsSnapshot: partsSnapshot
                } as any
            });

            await tx.repairPart.delete({
                where: { id: repairPartId }
            });
        });

        const admins = await db.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true }
        });

        const techName = (await db.user.findUnique({ where: { id: technicianId }, select: { name: true } }))?.name || "Técnico";

        await Promise.all(admins.map((admin: any) =>
            createNotificationAction({
                userId: admin.id,
                title: "Devolución de Repuesto (Inmediata)",
                message: `${techName} devolvió ${repairPart.sparePart.name} de la reparación #${repair.ticketNumber}.`,
                type: "ACTION_REQUEST",
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

export async function addPartToRepairAction(repairId: string, technicianId: string, parts: { id: string, name: string }[]) {
    try {
        if (!parts || parts.length === 0) {
            return { success: false, error: "No se seleccionaron repuestos." };
        }

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: { customer: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        if (repair.assignedUserId !== technicianId) {
            return { success: false, error: "No tienes asignada esta reparación" };
        }

        const currentUser = await getCurrentUser();

        await db.$transaction(async (tx) => {
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
                            reason: `Reparación #${repair.ticketNumber} (Agregado manual)`,
                            isChecked: false
                        }
                    });
                }
            }
        });

        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        return { success: true };

    } catch (error) {
        console.error("Error adding parts:", error);
        return { success: false, error: "Error al agregar repuestos." };
    }
}
