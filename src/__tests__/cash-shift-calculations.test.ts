import assert from "node:assert/strict";
import test from "node:test";
import { aggregateCashShiftSales, calculateCashShiftBonus, getCashShiftBonusRate } from "../lib/cash-shift-calculations";
import { buildCashShiftReprintSummary, type CashShiftReprintInput } from "../lib/cash-shift-reprint";

for (const [sales, rate, bonus] of [
    [0, 0.01, 0],
    [1, 0.01, 1_000],
    [985_000, 0.01, 10_000],
    [999_999, 0.01, 10_000],
    [1_000_000, 0.01, 10_000],
    [1_000_001, 0.01, 11_000],
    [1_010_000, 0.01, 11_000],
    [1_049_999, 0.01, 11_000],
    [1_050_000, 0.01, 11_000],
    [1_100_000, 0.01, 11_000],
    [1_100_001, 0.01, 12_000],
    [1_199_999, 0.01, 12_000],
    [1_200_000, 0.02, 24_000],
    [1_200_001, 0.02, 25_000],
    [1_250_000, 0.02, 25_000],
    [1_250_001, 0.02, 26_000],
]) {
    test(`sales ${sales}: shared prize ${bonus} at ${rate * 100}%`, () => {
        assert.equal(getCashShiftBonusRate(sales), rate);
        assert.equal(calculateCashShiftBonus(sales), bonus);
    });
}

test("rounding upward reconciles the actual prize withdrawal above the former million threshold", () => {
    const totalSales = 1_010_000;
    const prize = calculateCashShiftBonus(totalSales);
    const withdrawnPrize = 11_000;
    const counted = totalSales - withdrawnPrize;
    assert.equal(counted - (totalSales - prize), 0);
    const oldNearestPrize = Math.round(totalSales * 0.01 / 1_000) * 1_000;
    assert.equal(counted - (totalSales - oldNearestPrize), -1_000);
});

test("one peso of payment rounding cannot change the sales prize by a thousand", () => {
    const sales: CashShiftReprintInput["sales"] = [{ total: 1_050_000, paymentMethod: "SPLIT", payments: [
        { method: "CASH", amount: 549_999 }, { method: "CARD", amount: 500_000 },
    ] }];
    const totals = aggregateCashShiftSales(sales);
    assert.equal(totals.totalSales, 1_050_000);
    assert.equal(totals.cashSales, 549_999);
    assert.equal(totals.cardSales, 500_000);
    assert.equal(calculateCashShiftBonus(totals.totalSales), 11_000);
    const reprint = buildCashShiftReprintSummary({
        shift: { startAmount: 5_000, endAmount: 532_999, bonusTotal: 22_000, employeeCount: 2 },
        sales, expenses: [],
    });
    assert.equal(reprint.summary.calculatedBonus, 11_000);
    assert.equal(reprint.summary.expectedCash - reprint.summary.calculatedBonus * reprint.employeeCount, reprint.finalCount);
});

test("a real thousand peso cash shortage remains visible instead of being absorbed into the prize", () => {
    const result = buildCashShiftReprintSummary({
        shift: { startAmount: 0, endAmount: 998_000, bonusTotal: 10_000, employeeCount: 1 },
        sales: [{ total: 1_010_000, paymentMethod: "CASH", payments: [{ method: "CASH", amount: 1_009_000 }] }],
        expenses: [],
    });
    const expectedNet = result.summary.expectedCash - result.summary.calculatedBonus;
    assert.equal(expectedNet, 999_000);
    assert.equal(result.finalCount - expectedNet, -1_000);
});

test("reprinting preserves the prize actually stored under an older policy", () => {
    const result = buildCashShiftReprintSummary({
        shift: { startAmount: 0, endAmount: 969_999, bonusTotal: 30_000, employeeCount: 2 },
        sales: [{ total: 999_999, paymentMethod: "CASH", payments: [] }], expenses: [],
    });
    assert.equal(result.summary.calculatedBonus, 15_000);
    assert.equal(result.summary.expectedCash - result.summary.calculatedBonus * result.employeeCount, result.finalCount);
});

test("legacy sales and mixed payments share the same cash aggregation", () => {
    assert.deepEqual(aggregateCashShiftSales([
        { total: 100_000, paymentMethod: "CASH", payments: [] },
        { total: 50_000, paymentMethod: "SPLIT", payments: [
            { method: "CASH", amount: 10_000 }, { method: "MERCADOPAGO", amount: 40_000 },
        ] },
    ]), { totalSales: 150_000, cashSales: 110_000, cardSales: 0, mpSales: 40_000 });
});

test("fractional prices cannot inflate an exact prize bracket by a thousand pesos", () => {
    const amounts = [...Array<number>(12).fill(91_666.66), 0.08];
    const totals = aggregateCashShiftSales(amounts.map(total => ({
        total, paymentMethod: "CASH", payments: [{ method: "CASH", amount: total }],
    })));
    assert.equal(totals.totalSales, 1_100_000);
    assert.equal(totals.cashSales, 1_100_000);
    assert.equal(calculateCashShiftBonus(totals.totalSales), 11_000);
    // Also protect callers supplying a total previously summed with floats.
    assert.equal(calculateCashShiftBonus(amounts.reduce((sum, amount) => sum + amount, 0)), 11_000);
});

test("cent precision preserves both sides of the double prize and rounding boundaries", () => {
    assert.equal(calculateCashShiftBonus(1_100_000.01), 12_000);
    assert.equal(calculateCashShiftBonus(1_199_999.99), 12_000);
    assert.equal(getCashShiftBonusRate(1_199_999.99), 0.01);
    assert.equal(getCashShiftBonusRate(1_200_000 - Number.EPSILON * 1_200_000), 0.02);
    assert.equal(calculateCashShiftBonus(1_200_000), 24_000);
    assert.equal(calculateCashShiftBonus(1_200_000.01), 25_000);
});

test("cash, card and transfer allocations aggregate in cents", () => {
    const totals = aggregateCashShiftSales([0.1, 0.2].map(amount => ({
        total: amount * 3, paymentMethod: "SPLIT", payments: [
            { method: "CASH", amount }, { method: "CARD", amount }, { method: "TRANSFER", amount },
        ],
    })));
    assert.deepEqual(totals, { totalSales: 0.9, cashSales: 0.3, cardSales: 0.3, mpSales: 0.3 });
});
