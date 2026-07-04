import assert from "node:assert/strict";
import test from "node:test";

import { buildSalePaymentDetails } from "../lib/sale-payment-details";

test("builds admin mixed payment details with method labels and amounts", () => {
    const details = buildSalePaymentDetails({
        total: 120000,
        paymentMethod: "SPLIT",
        payments: [
            { method: "CASH", amount: 50000 },
            { method: "MERCADOPAGO", amount: 70000 },
        ],
    });

    assert.equal(details.label, "Mixto");
    assert.equal(details.isMixed, true);
    assert.deepEqual(details.rows, [
        { method: "CASH", label: "Efectivo", amount: 50000, formattedAmount: "$50.000" },
        { method: "MERCADOPAGO", label: "MercadoPago", amount: 70000, formattedAmount: "$70.000" },
    ]);
    assert.equal(details.formattedTotal, "$120.000");
});

test("groups repeated mixed payment methods before displaying details", () => {
    const details = buildSalePaymentDetails({
        total: 120000,
        paymentMethod: "SPLIT",
        payments: [
            { method: "CASH", amount: 20000 },
            { method: "CARD", amount: 40000 },
            { method: "CASH", amount: 60000 },
        ],
    });

    assert.deepEqual(details.rows, [
        { method: "CASH", label: "Efectivo", amount: 80000, formattedAmount: "$80.000" },
        { method: "CARD", label: "Tarjeta", amount: 40000, formattedAmount: "$40.000" },
    ]);
});
