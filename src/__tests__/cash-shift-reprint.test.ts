import assert from "node:assert/strict";
import test from "node:test";
import { buildCashShiftReprintSummary } from "../lib/cash-shift-reprint";

test("rebuilds a closed shift from bounded payments and expenses", () => {
    const result = buildCashShiftReprintSummary({
        shift: {
            startAmount: 10_000,
            endAmount: 20_000,
            employeeCount: 2,
            bonusTotal: 4_000,
        },
        sales: [
            {
                total: 100_000,
                paymentMethod: "MIXTO",
                payments: [
                    { method: "CASH", amount: 60_000 },
                    { method: "CARD", amount: 40_000 },
                ],
            },
            {
                total: 50_000,
                paymentMethod: "MERCADOPAGO",
                payments: [],
            },
        ],
        expenses: [{ amount: 10_000 }],
    });

    assert.deepEqual(result, {
        summary: {
            expectedCash: 60_000,
            totalSales: 150_000,
            cashSales: 60_000,
            cardSales: 40_000,
            mpSales: 50_000,
            expenses: 10_000,
            calculatedBonus: 2_000,
        },
        billCounts: {},
        finalCount: 20_000,
        employeeCount: 2,
    });
});

test("calculates the historical bonus when an old shift did not store it", () => {
    const result = buildCashShiftReprintSummary({
        shift: {
            startAmount: 5_000,
            endAmount: null,
            employeeCount: 0,
            bonusTotal: 0,
        },
        sales: [{ total: 80_000, paymentMethod: "CASH", payments: [] }],
        expenses: [],
    });

    assert.equal(result.employeeCount, 1);
    assert.equal(result.finalCount, 0);
    assert.equal(result.summary.calculatedBonus, 1_000);
    assert.equal(result.summary.expectedCash, 85_000);
});
