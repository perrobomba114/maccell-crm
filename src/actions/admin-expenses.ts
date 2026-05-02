"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import type { Prisma } from "@prisma/client";
import { getDailyRange, getMonthlyRange, TIMEZONE } from "@/lib/date-utils";
import type { ExpenseBranchSummary } from "@/types/admin-expenses";

export async function getExpensesAction({
    date,
    page = 1,
    limit = 25,
    userId
}: {
    date?: string;
    page?: number;
    limit?: number;
    userId?: string;
}) {
    try {
        const where: Prisma.ExpenseWhereInput = {};

        // Determine Reference Date (Argentina Time)
        // If date is provided, use it. If not, get today in AR.
        const referenceDateStr = date || formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");

        if (date) {
            const { start, end } = getDailyRange(referenceDateStr);

            where.createdAt = {
                gte: start,
                lte: end
            };
        }

        if (userId) {
            where.userId = userId;
        }

        const skip = (page - 1) * limit;

        const [expenses, totalCount, aggregations] = await Promise.all([
            db.expense.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, imageUrl: true }
                    },
                    branch: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            db.expense.count({ where }),
            db.expense.aggregate({
                where,
                _sum: { amount: true }
            })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        const totalAmount = aggregations._sum.amount || 0;

        const { start, end } = getMonthlyRange(referenceDateStr);

        const monthlyWhere: Prisma.ExpenseWhereInput = {
            createdAt: {
                gte: start,
                lte: end
            },
            userId: userId || undefined
        };

        const [monthlyAggregations, branchGroups] = await Promise.all([
            db.expense.aggregate({
                where: monthlyWhere,
                _sum: { amount: true }
            }),
            db.expense.groupBy({
                by: ["branchId"],
                where: monthlyWhere,
                _sum: { amount: true },
                _count: { _all: true },
                orderBy: { _sum: { amount: "desc" } },
            })
        ]);

        const branches = await db.branch.findMany({
            where: {
                id: { in: branchGroups.map((group) => group.branchId) }
            },
            select: { id: true, name: true }
        });

        const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
        const branchSummary: ExpenseBranchSummary[] = branchGroups.map((group) => ({
            branchName: branchNames.get(group.branchId) || "Sucursal sin nombre",
            total: group._sum.amount || 0,
            count: group._count._all,
        }));

        const monthlyTotal = monthlyAggregations._sum.amount || 0;

        return {
            expenses,
            totalCount,
            totalPages,
            currentPage: page,
            totalAmount,
            monthlyTotal,
            branchSummary
        };

    } catch (error) {
        console.error("Error getting expenses:", error);
        return {
            expenses: [],
            totalCount: 0,
            totalPages: 0,
            currentPage: 1,
            totalAmount: 0,
            monthlyTotal: 0,
            branchSummary: []
        };
    }
}

export async function updateExpenseAction(id: string, data: { amount: number; description: string }) {
    try {
        if (!id) return { success: false, error: "ID de gasto requerido" };
        if (!data.amount || data.amount <= 0) return { success: false, error: "El monto debe ser mayor a 0" };
        if (!data.description || data.description.trim().length < 3) return { success: false, error: "Descripción inválida" };

        await db.expense.update({
            where: { id },
            data: {
                amount: data.amount,
                description: data.description
            }
        });

        revalidatePath("/admin/expenses");
        return { success: true };
    } catch (error) {
        console.error("Error updating expense:", error);
        return { success: false, error: "Error al actualizar gasto" };
    }
}

export async function deleteExpenseAction(id: string) {
    try {
        if (!id) return { success: false, error: "ID de gasto requerido" };

        await db.expense.delete({
            where: { id }
        });

        revalidatePath("/admin/expenses");
        return { success: true };
    } catch (error) {
        console.error("Error deleting expense:", error);
        return { success: false, error: "Error al eliminar gasto" };
    }
}
