"use server";

import { db as prisma } from "@/lib/db";
import { getMonthlyRange } from "@/lib/date-utils";

export async function getRepairStats(branchId?: string, date?: Date) {
    try {
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        const whereRepair = branchId ? { branchId } : {};

        const [topPartsRaw, techStats, phonesInStock, repairCount] = await Promise.all([
            prisma.repairPart.groupBy({
                by: ['sparePartId'],
                where: {
                    repair: whereRepair,
                    assignedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                },
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 10
            }),
            prisma.repair.groupBy({
                by: ['assignedUserId'],
                where: {
                    statusId: { in: [5, 6, 7, 10] }, 
                    finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    assignedUserId: { not: null },
                    ...whereRepair
                },
                _count: { _all: true }
            }),
            prisma.repair.count({
                where: {
                    statusId: { not: 10 },
                    ...whereRepair
                }
            }),
            prisma.repair.count({
                where: {
                    statusId: { in: [5, 6, 7, 10] },
                    finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    ...whereRepair
                }
            })
        ]);

        const partIds = topPartsRaw.map(p => p.sparePartId);
        const userIds = techStats.map(t => t.assignedUserId!).filter(Boolean);

        const [partsInfo, users] = await Promise.all([
            prisma.sparePart.findMany({ where: { id: { in: partIds } } }),
            prisma.user.findMany({ where: { id: { in: userIds } } })
        ]);

        const mostUsedParts = topPartsRaw.map(t => {
            const info = partsInfo.find(p => p.id === t.sparePartId);
            return {
                name: info?.name || 'Unknown',
                count: t._sum.quantity || 0,
                stockLocal: info?.stockLocal,
                toReponish: info ? (info.maxStockLocal - info.stockLocal) : 0
            };
        });

        const bestTechnicians = techStats.map(t => ({
            name: users.find(u => u.id === t.assignedUserId)?.name || 'Unknown',
            repairs: t._count._all
        })).sort((a, b) => b.repairs - a.repairs);


        return {
            mostUsedParts,
            bestTechnicians,
            repairVolume: repairCount,
            phonesInShop: phonesInStock
        };

    } catch (error) {
        console.error("Error in getRepairStats:", error);
        return { mostUsedParts: [], bestTechnicians: [], repairVolume: 0, phonesInShop: 0 };
    }
}
