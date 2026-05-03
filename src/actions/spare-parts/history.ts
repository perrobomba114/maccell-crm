"use server";

import { Prisma } from "@prisma/client";
import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";
import { getDailyRange } from "@/lib/date-utils";

const sparePartHistoryInclude = {
    user: { select: { name: true, email: true } },
    branch: { select: { name: true, code: true } },
    sparePart: { select: { name: true, sku: true } }
} satisfies Prisma.SparePartHistoryInclude;

export type SparePartHistoryListItem = Prisma.SparePartHistoryGetPayload<{
    include: typeof sparePartHistoryInclude;
}>;

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
        const user = await getCurrentUser();
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        const where: Prisma.SparePartHistoryWhereInput = {
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
            prisma.sparePartHistory.findMany({
                where,
                include: sparePartHistoryInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.sparePartHistory.count({ where })
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
        const user = await getCurrentUser();
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        const item = await prisma.sparePartHistory.findUnique({ where: { id } });
        if (!item) return { success: false, error: "Registro no encontrado" };

        await prisma.sparePartHistory.update({
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

            const existing = await prisma.sparePartHistory.findFirst({
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

                await prisma.sparePartHistory.create({
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

    } catch (error: unknown) {
        console.error("Error syncing history:", error);
        const message = error instanceof Error ? error.message : "Desconocido";
        return { success: false, error: `Error: ${message}` };
    }
}
