"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";
import { getDailyRange } from "@/lib/date-utils";

export async function getSparePartsHistory({
    page = 1,
    limit = 25,
    date
}: {
    page?: number,
    limit?: number,
    date?: string // YYYY-MM-DD
}) {
    try {
        const where: any = {
            NOT: { reason: 'Reposición desde depósito' }
        };

        if (date) {
            const { start: startOfDay, end: endOfDay } = getDailyRange(date);
            where.createdAt = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const skip = (page - 1) * limit;

        const [history, total] = await Promise.all([
            (prisma as any).sparePartHistory.findMany({
                where,
                include: {
                    user: { select: { name: true, email: true } },
                    branch: { select: { name: true, code: true } },
                    sparePart: { select: { name: true, sku: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            (prisma as any).sparePartHistory.count({ where })
        ]);

        return {
            success: true,
            history,
            pagination: {
                total,
                limit,
                page,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error("Get history error:", error);
        return { success: false, error: "Error al obtener historial" };
    }
}

export async function toggleHistoryChecked(id: string) {
    try {
        const item = await (prisma as any).sparePartHistory.findUnique({ where: { id } });
        if (!item) return { success: false, error: "Registro no encontrado" };

        await (prisma as any).sparePartHistory.update({
            where: { id },
            data: { isChecked: !item.isChecked }
        });

        revalidatePath("/admin/repuestos/historial");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar" };
    }
}

export async function syncRepairHistoryAction() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 60);

        const repairParts = await prisma.repairPart.findMany({
            where: {
                assignedAt: {
                    gte: limitDate
                }
            },
            include: {
                repair: true,
                sparePart: true
            }
        });

        console.warn(`[DEBUG][syncHistory] Found ${repairParts.length} repair parts since ${limitDate.toISOString()}`);

        let addedCount = 0;

        for (const rp of repairParts) {
            const ticketPattern = `Reparación #${rp.repair.ticketNumber}`;

            const existing = await (prisma as any).sparePartHistory.findFirst({
                where: {
                    sparePartId: rp.sparePartId,
                    reason: {
                        contains: ticketPattern
                    },
                }
            });

            if (!existing) {
                const userId = rp.repair.assignedUserId || rp.repair.userId;
                const branchId = rp.repair.branchId;

                await (prisma as any).sparePartHistory.create({
                    data: {
                        sparePartId: rp.sparePartId,
                        userId: userId,
                        branchId: branchId,
                        quantity: -rp.quantity, 
                        reason: `${ticketPattern} (Sincronizado)`,
                        isChecked: true, 
                        createdAt: rp.assignedAt 
                    }
                });
                addedCount++;
            }
        }

        revalidatePath("/admin/repuestos/historial");
        return { success: true, count: addedCount };

    } catch (error: any) {
        console.error("Error syncing history:", error);
        return { success: false, error: `Error: ${error.message || "Desconocido"}` };
    }
}
