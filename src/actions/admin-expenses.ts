"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getExpensesAction({
    date,
    page = 1,
    limit = 20
}: {
    date?: string;
    page?: number;
    limit?: number;
}) {
    try {
        const where: any = {};

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            where.createdAt = {
                gte: startDate,
                lte: endDate
            };
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

        // Calculate total amount for the filtered period
        const aggregations = await db.expense.aggregate({
            where,
            _sum: { amount: true }
        });
        const totalAmount = aggregations._sum.amount || 0;

        return {
            expenses,
            totalCount,
            totalPages,
            currentPage: page,
            totalAmount
        };

    } catch (error) {
        console.error("Error getting expenses:", error);
        return {
            expenses: [],
            totalCount: 0,
            totalPages: 0,
            currentPage: 1,
            totalAmount: 0
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
