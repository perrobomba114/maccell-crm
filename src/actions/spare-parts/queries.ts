"use server";

import { db as prisma } from "@/lib/db";

export async function getSpareParts(options?: { sort?: string; order?: 'asc' | 'desc' }) {
    try {
        const { sort = 'createdAt', order = 'desc' } = options || {};

        let orderBy: any = {};
        if (sort === 'category') {
            orderBy = { category: { name: order } };
        } else if (sort === 'reponer') {
            orderBy = { name: 'asc' };
        } else {
            orderBy = { [sort]: order };
        }

        const spareParts = await prisma.sparePart.findMany({
            where: { deletedAt: null },
            include: { category: true },
            orderBy: orderBy,
        });

        if (spareParts.length > 0 && (spareParts[0] as any).pricePos === undefined) {
            console.warn("Detected stale client in getSpareParts (missing pricePos). Fetching manually.");
            try {
                const rawPrices = await prisma.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;
                const priceMap = new Map();
                if (Array.isArray(rawPrices)) {
                    rawPrices.forEach((p: any) => priceMap.set(p.id, p.pricePos));
                }
                spareParts.forEach((part: any) => {
                    part.pricePos = priceMap.get(part.id) || 0;
                });
            } catch (rawError) {
                console.error("Failed to fetch raw pricePos:", rawError);
            }
        }

        if (sort === 'reponer') {
            spareParts.sort((a, b) => {
                const neededA = Math.max(0, a.maxStockLocal - a.stockLocal);
                const reponerA = Math.min(neededA, a.stockDepot);

                const neededB = Math.max(0, b.maxStockLocal - b.stockLocal);
                const reponerB = Math.min(neededB, b.stockDepot);

                if (order === 'asc') return reponerA - reponerB;
                return reponerB - reponerA;
            });
        }

        return { success: true, spareParts };
    } catch (error) {
        console.error("Get spare parts error:", error);
        return { success: false, error: "Error al obtener repuestos" };
    }
}

export async function getAllSparePartsForExport() {
    try {
        const spareParts = await prisma.sparePart.findMany({
            where: { deletedAt: null },
            include: { category: true },
            orderBy: { name: "asc" }
        });

        if (spareParts.length > 0 && (spareParts[0] as any).pricePos === undefined) {
            try {
                const rawPrices = await prisma.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;
                const priceMap = new Map();
                if (Array.isArray(rawPrices)) {
                    rawPrices.forEach((p: any) => priceMap.set(p.id, p.pricePos));
                }
                spareParts.forEach((part: any) => {
                    part.pricePos = priceMap.get(part.id) || 0;
                });
            } catch (e) { console.error("Export fallback error", e); }
        }

        return { success: true, spareParts };
    } catch (error) {
        console.error("Export error:", error);
        return { success: false, error: "Error al obtener datos para exportar" };
    }
}

export async function getSparePartsForBuyReport(categoryId: string) {
    try {
        const where: any = {
            deletedAt: null,
            stockLocal: { lt: 10 },
            stockDepot: { lt: 10 }
        };

        if (categoryId !== "all") {
            where.categoryId = categoryId;
        }

        const spareParts = await prisma.sparePart.findMany({
            where,
            include: { category: true },
            orderBy: { name: 'asc' }
        });

        const reportData = spareParts.map(part => ({
            ...part,
            quantityToBuy: Math.max(0, part.maxStockLocal - part.stockLocal)
        }));

        return { success: true, data: reportData };
    } catch (error) {
        console.error("Get buy report error:", error);
        return { success: false, error: "Error al obtener repuestos para compra" };
    }
}
