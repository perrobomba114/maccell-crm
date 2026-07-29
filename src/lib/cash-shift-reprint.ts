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
    let cashSales = 0;
    let cardSales = 0;
    let mpSales = 0;
    let totalSales = 0;

    for (const sale of input.sales) {
        totalSales += sale.total;
        const allocations = sale.payments.length > 0
            ? sale.payments
            : [{ method: sale.paymentMethod, amount: sale.total }];

        for (const payment of allocations) {
            if (payment.method === "CASH") cashSales += payment.amount;
            if (payment.method === "CARD") cardSales += payment.amount;
            if (payment.method === "MERCADOPAGO" || payment.method === "TRANSFER") mpSales += payment.amount;
        }
    }

    const expenses = input.expenses.reduce((total, expense) => total + expense.amount, 0);
    const employeeCount = Math.max(1, input.shift.employeeCount);
    const bonusRate = totalSales >= 1_200_000 ? 0.02 : 0.01;
    const calculatedBonus = input.shift.bonusTotal > 0
        ? input.shift.bonusTotal / employeeCount
        : Math.round((totalSales * bonusRate) / 1_000) * 1_000;

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
