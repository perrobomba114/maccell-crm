/** Shared cash arithmetic: sales define the prize base; payment allocations define the drawer. */
export const DOUBLE_BONUS_THRESHOLD = 1_200_000;

function toCents(amount: number): number {
    return Math.round(amount * 100);
}

export function getCashShiftBonusRate(totalSales: number): number {
    return toCents(totalSales) >= DOUBLE_BONUS_THRESHOLD * 100 ? 0.02 : 0.01;
}

export function calculateCashShiftBonus(totalSales: number): number {
    // The prize is paid per employee, always rounded UP to a whole $1,000.
    // Calculate integer percentage units from cents so binary fractions cannot
    // turn an exact $11,000 prize into the next $1,000 bracket.
    const percent = getCashShiftBonusRate(totalSales) === 0.02 ? 2 : 1;
    return Math.ceil((toCents(totalSales) * percent) / 10_000_000) * 1_000;
}

export type CashShiftSale = {
    total: number;
    paymentMethod: string;
    payments: Array<{ method: string; amount: number }>;
};

export function aggregateCashShiftSales(sales: CashShiftSale[]) {
    let cashSales = 0;
    let cardSales = 0;
    let mpSales = 0;
    let totalSales = 0;
    for (const sale of sales) {
        totalSales += toCents(sale.total);
        const payments = sale.payments.length > 0
            ? sale.payments
            : [{ method: sale.paymentMethod, amount: sale.total }];
        for (const payment of payments) {
            if (payment.method === "CASH") cashSales += toCents(payment.amount);
            else if (payment.method === "CARD") cardSales += toCents(payment.amount);
            else if (payment.method === "MERCADOPAGO" || payment.method === "TRANSFER") mpSales += toCents(payment.amount);
        }
    }
    return { totalSales: totalSales / 100, cashSales: cashSales / 100, cardSales: cardSales / 100, mpSales: mpSales / 100 };
}
