import assert from "node:assert/strict";
import test from "node:test";

import { resolveAdminFiscalContext, validateAndCalculateAdminInvoice } from "../lib/admin-invoice-validation";

const baseInput = {
    requestId: "019f72c7-41f9-77b0-94e3-57fb3a1f9491",
    branchId: "branch-1",
    customer: {
        docType: "FINAL" as const,
        docNumber: "0",
        name: "Consumidor Final",
        address: "",
        ivaCondition: "Consumidor Final",
    },
    items: [{ description: "Servicio técnico", quantity: 1, unitPrice: 1210, vatCondition: "21" as const }],
    invoiceType: "B" as const,
    paymentMethod: "CASH" as const,
    concept: 1 as const,
};

test("admin invoice validation calculates net and VAT from gross item prices", () => {
    const result = validateAndCalculateAdminInvoice(baseInput);

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(result.totals, { net: 1000, vat: 210, total: 1210 });
});

test("admin invoice validation requires CUIT and Responsable Inscripto for invoice A", () => {
    const result = validateAndCalculateAdminInvoice({
        ...baseInput,
        invoiceType: "A",
    });

    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /Factura A.*CUIT.*Responsable Inscripto/i);
});

test("admin invoice validation rejects non-positive quantities and prices", () => {
    const result = validateAndCalculateAdminInvoice({
        ...baseInput,
        items: [{ ...baseInput.items[0], quantity: 0, unitPrice: Number.NaN }],
    });

    assert.equal(result.success, false);
});

test("admin invoice validation derives entity and sales point from the selected branch", () => {
    assert.deepEqual(resolveAdminFiscalContext({ name: "MACCELL 2", code: "M2" }), {
        billingEntity: "MACCELL",
        salesPoint: 10,
    });
    assert.deepEqual(resolveAdminFiscalContext({ name: "8 BIT ACCESORIOS", code: "8BIT" }), {
        billingEntity: "8BIT",
        salesPoint: 3,
    });
});

test("admin invoice validation preserves the selected payment method", () => {
    const result = validateAndCalculateAdminInvoice({
        ...baseInput,
        paymentMethod: "CARD",
    });

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.paymentMethod, "CARD");
});
