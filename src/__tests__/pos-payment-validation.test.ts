import assert from "node:assert/strict";
import test from "node:test";
import { validatePosAmounts } from "../lib/pos-payment-validation";

const item = { type: "PRODUCT", price: 10_000, quantity: 1 };
for (const method of ["CASH", "CARD", "MERCADOPAGO", "SPLIT"]) {
    test(`${method} rejects excess and missing money, even one peso`, () => {
        for (const amount of [9_000, 9_999, 10_001, 11_000]) {
            assert.ok(validatePosAmounts({ total: 10_000, paymentMethod: method, payments: [{ method: method === "SPLIT" ? "CASH" : method, amount }], items: [item] }));
        }
    });
}

test("rejects fictitious cash offset by a negative electronic payment", () => {
    assert.ok(validatePosAmounts({ total: 10_000, paymentMethod: "SPLIT", payments: [{ method: "CASH", amount: 11_000 }, { method: "MERCADOPAGO", amount: -1_000 }], items: [item] }));
});

test("rejects non-finite, fractional-cent and non-positive payment values", () => {
    for (const amount of [NaN, Infinity, -Infinity, -1, 0, 10_000.001]) {
        assert.ok(validatePosAmounts({ total: 10_000, paymentMethod: "CASH", payments: [{ method: "CASH", amount }], items: [item] }));
    }
    for (const total of [NaN, Infinity, -1, 10_000.001]) {
        assert.ok(validatePosAmounts({ total, items: [item] }));
    }
});

test("valid mixed cents survive floating point arithmetic", () => {
    assert.equal(validatePosAmounts({ total: 0.1 + 0.2, paymentMethod: "SPLIT", payments: [{ method: "CASH", amount: 0.1 }, { method: "CARD", amount: 0.2 }], items: [{ type: "PRODUCT", price: 0.1, quantity: 3 }] }), null);
});

test("keeps repair delivery without a charge and legacy single-method payments", () => {
    assert.equal(validatePosAmounts({ total: 0, paymentMethod: "SPLIT", payments: [], items: [{ type: "REPAIR", price: 0, quantity: 1 }, { type: "REPAIR", price: 0, quantity: 1 }] }), null);
    assert.equal(validatePosAmounts({ total: 10_000, paymentMethod: "MERCADOPAGO", items: [item] }), null);
    assert.equal(validatePosAmounts({ total: 10_000, items: [item] }), null);
    assert.ok(validatePosAmounts({ total: 10_000, paymentMethod: "SPLIT", payments: [], items: [item] }));
});

test("rejects item/total discrepancies and invalid quantities", () => {
    assert.ok(validatePosAmounts({ total: 10_000, paymentMethod: "CASH", payments: [{ method: "CASH", amount: 10_000 }], items: [{ ...item, price: 9_000 }] }));
    for (const quantity of [0, -1, 1.5, NaN, Infinity]) assert.ok(validatePosAmounts({ total: 10_000, items: [{ ...item, quantity }] }));
});

test("rejects invalid allocation methods and inconsistent single payment header", () => {
    for (const method of ["SPLIT", "TRANSFER", "OTHER"]) {
        assert.ok(validatePosAmounts({ total: 10_000, paymentMethod: "SPLIT", payments: [{ method, amount: 10_000 }], items: [item] }));
    }
    assert.ok(validatePosAmounts({ total: 10_000, paymentMethod: "CASH", payments: [{ method: "CARD", amount: 10_000 }], items: [item] }));
});
