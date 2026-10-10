import { aggregateCashShiftSales } from "./cash-shift-calculations";

export type CashShiftReprintPaymentMethod = "CASH" | "CARD" | "MERCADOPAGO" | "TRANSFER" | "MIXTO" | "SPLIT";

export type CashShiftReprintInput = {
    shift: {
        startAmount: number;
        endAmount: number | null;
        employeeCount: number;
        bonusTotal: number;
    };
    sales: Array<{
        total: number;
        paymentMethod: CashShiftReprintPaymentMethod;
        payments: Array<{
            method: CashShiftReprintPaymentMethod;
            amount: number;
        }>;
    }>;
    expenses: Array<{ amount: number }>;
};

export type CashShiftReprintSummary = {
    summary: {
        expectedCash: number;
        totalSales: number;
        cashSales: number;
        cardSales: number;
        mpSales: number;
        expenses: number;
        calculatedBonus: number;
    };
    billCounts: Record<number, number>;
    finalCount: number;
    employeeCount: number;
};

export function buildCashShiftReprintSummary(input: CashShiftReprintInput): CashShiftReprintSummary {
    const { totalSales, cashSales, cardSales, mpSales } = aggregateCashShiftSales(input.sales);

    const expenses = input.expenses.reduce((total, expense) => total + expense.amount, 0);
    const employeeCount = Math.max(1, input.shift.employeeCount);
    // A closed receipt must preserve the recorded withdrawal, including zero.
    const calculatedBonus = input.shift.bonusTotal / employeeCount;

    return {
        summary: {
            expectedCash: input.shift.startAmount + cashSales - expenses,
            totalSales,
            cashSales,
            cardSales,
            mpSales,
            expenses,
            calculatedBonus,
        },
        billCounts: {},
        finalCount: input.shift.endAmount ?? 0,
        employeeCount,
    };
}
