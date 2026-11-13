"use server";

import { summarizeReplenishment } from "@/lib/replenishment-summary";
import { getCurrentUser } from "@/actions/auth-actions";
import { db as prisma } from "@/lib/db";
import { getMonthlyRange } from "@/lib/date-utils";

export async function getProductStats(branchId?: string, date?: Date) {
    try {
        if ((await getCurrentUser())?.role !== "ADMIN") return { topSelling: [], lowStock: [], stockByBranch: [], mostProfitable: [] };
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        const whereSale = branchId ? { branchId } : {};

        const [items, branches] = await Promise.all([
            prisma.saleItem.findMany({
                where: {
                    productId: { not: null },
                    sale: { ...whereSale, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
                },
                select: {
                    productId: true,
                    name: true,
                    quantity: true,
                    price: true,
                    sale: { select: { branchId: true } },
                    product: { select: { costPrice: true } }
                }
            }),
            prisma.branch.findMany({ where: branchId ? { id: branchId } : {}, select: { id: true, name: true }, orderBy: { name: "asc" } })
        ]);

        const salesMap = new Map<string, { name: string, quantity: number, productId: string }>();
        items.forEach(item => {
            const key = item.productId || item.name;
            const current = salesMap.get(key) || { name: item.name, quantity: 0, productId: item.productId! };
            current.quantity += item.quantity;
            salesMap.set(key, current);
        });

        const topSelling = Array.from(salesMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        const products = await prisma.product.findMany({
            where: { id: { in: Array.from(salesMap.keys()) }, deletedAt: null },
            select: { id: true, name: true, stock: { where: branchId ? { branchId } : {}, select: { branchId: true, quantity: true } } }
        });
        const { replenishmentSuggestions, stockByBranch } = summarizeReplenishment(products, branches, items, salesMap, branchId);

        const profitMap = new Map<string, { name: string, profit: number }>();
        items.forEach(item => {
            if (!item.product) return;
            const key = item.productId!;
            const profit = (item.price - item.product.costPrice) * item.quantity;

            const current = profitMap.get(key) || { name: item.name, profit: 0 };
            current.profit += profit;
            profitMap.set(key, current);
        });

        const mostProfitable = Array.from(profitMap.values())
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);

        return {
            topSelling,
            lowStock: replenishmentSuggestions,
            stockByBranch,
            mostProfitable
        };

    } catch (error) {
        console.error("Error in getProductStats:", error);
        return { topSelling: [], lowStock: [], stockByBranch: [], mostProfitable: [] };
    }
}
