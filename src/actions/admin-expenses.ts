"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "America/Argentina/Buenos_Aires";

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
        const where: any = {};

        // Determine Reference Date (Argentina Time)
        // If date is provided, use it. If not, get today in AR.
        const referenceDateStr = date || formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");

        // 1. Daily Query Range (AR Time -> UTC)
        // Explicitly parse 00:00:00 AR and 23:59:59 AR
        if (date) {
            const startDate = fromZonedTime(`${referenceDateStr} 00:00:00`, TIMEZONE);
            const endDate = fromZonedTime(`${referenceDateStr} 23:59:59.999`, TIMEZONE);

            where.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        if (userId) {
            where.userId = userId;
        }

        const skip = (page - 1) * limit;

        const [expenses, totalCount] = await Promise.all([
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
            db.expense.count({ where })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        // Daily/Filtered Total
        const aggregations = await db.expense.aggregate({
            where,
            _sum: { amount: true }
        });
        const totalAmount = aggregations._sum.amount || 0;

        // 2. Monthly Query Range (AR Time -> UTC)
        // Calculate the first and last day of the month based on referenceDateStr
        const [year, month] = referenceDateStr.split('-').map(Number);

        // Start: 1st of month 00:00:00
        const startOfMonth = fromZonedTime(`${year}-${String(month).padStart(2, '0')}-01 00:00:00`, TIMEZONE);

        // End: Last day of month 23:59:59
        // Trick: Day 0 of next month gives last day of current month
        const lastDay = new Date(year, month, 0).getDate();
        const endOfMonth = fromZonedTime(`${year}-${String(month).padStart(2, '0')}-${lastDay} 23:59:59.999`, TIMEZONE);

        const monthlyAggregations = await db.expense.aggregate({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                userId: userId // Maintain same user context for monthly total if present
                    ? userId
                    : undefined
            },
            _sum: { amount: true }
        });
        const monthlyTotal = monthlyAggregations._sum.amount || 0;

        return {
            expenses,
            totalCount,
            totalPages,
            currentPage: page,
            totalAmount,
            monthlyTotal
        };

    } catch (error) {
        console.error("Error getting expenses:", error);
        return {
            expenses: [],
            totalCount: 0,
            totalPages: 0,
            currentPage: 1,
            totalAmount: 0,
            monthlyTotal: 0
        };
    }
}

export async function updateExpenseAction(id: string, data: { amount: number; description: string }) {
    try {
        if (!id) return { success: false, error: "ID de gasto requerido" };

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
