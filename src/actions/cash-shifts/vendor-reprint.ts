"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import { db as prisma } from "@/lib/db";
import { getDailyRange } from "@/lib/date-utils";
import {
    buildCashShiftReprintSummary,
    type CashShiftReprintSummary,
} from "@/lib/cash-shift-reprint";

type VendorCashShiftReprintData = CashShiftReprintSummary & {
    closedAt: Date;
    branch: {
        name: string;
        address: string | null;
        imageUrl: string | null;
    };
    user: { name: string };
    shift: {
        startAmount: number;
        startTime: Date;
    };
};

export type VendorCashShiftReprintResult =
    | { success: true; data: VendorCashShiftReprintData }
    | { success: false; error: string };

export async function getLatestVendorCashShiftForReprint(date: string): Promise<VendorCashShiftReprintResult> {
    const user = await getCurrentUser();
    if (!user || user.role !== "VENDOR") {
        return { success: false, error: "No autorizado" };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { success: false, error: "Fecha inválida" };
    }

    try {
        const { start, end } = getDailyRange(date);
        const shift = await prisma.cashShift.findFirst({
            where: {
                userId: user.id,
                status: "CLOSED",
                startTime: { gte: start, lte: end },
            },
            select: {
                id: true,
                branchId: true,
                startTime: true,
                endTime: true,
                startAmount: true,
                endAmount: true,
                employeeCount: true,
                bonusTotal: true,
                branch: { select: { name: true, address: true, imageUrl: true } },
                user: { select: { name: true } },
            },
            orderBy: [{ endTime: "desc" }, { id: "desc" }],
        });

        if (!shift || !shift.endTime) {
            return { success: false, error: "No hay un cierre de caja para la fecha seleccionada" };
        }

        const [sales, expenses] = await Promise.all([
            prisma.sale.findMany({
                where: {
                    vendorId: user.id,
                    branchId: shift.branchId,
                    createdAt: { gte: shift.startTime, lte: shift.endTime },
                },
                select: {
                    total: true,
                    paymentMethod: true,
                    payments: { select: { method: true, amount: true } },
                },
            }),
            prisma.expense.findMany({
                where: {
                    userId: user.id,
                    branchId: shift.branchId,
                    createdAt: { gte: shift.startTime, lte: shift.endTime },
                },
                select: { amount: true },
            }),
        ]);

        const totals = buildCashShiftReprintSummary({
            shift: {
                startAmount: shift.startAmount,
                endAmount: shift.endAmount,
                employeeCount: shift.employeeCount,
                bonusTotal: shift.bonusTotal,
            },
            sales,
            expenses,
        });

        return {
            success: true,
            data: {
                ...totals,
                closedAt: shift.endTime,
                branch: shift.branch,
                user: shift.user,
                shift: {
                    startAmount: shift.startAmount,
                    startTime: shift.startTime,
                },
            },
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[CASH_REPRINT] Failed to load closed shift:", message);
        return { success: false, error: "No se pudo recuperar el cierre de caja" };
    }
}
