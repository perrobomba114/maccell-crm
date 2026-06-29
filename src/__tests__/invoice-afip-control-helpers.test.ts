import assert from "node:assert/strict";
import test from "node:test";

import { buildAfipRanges } from "../actions/invoice-afip-control-helpers";
import { buildDebitVatSummary } from "../actions/invoice-summary-helpers";

test("builds ARCA voucher ranges by fiscal entity and voucher type", () => {
    const ranges = buildAfipRanges([
        {
            billingEntity: null,
            totalAmount: 1000,
            netAmount: 826.45,
            vatAmount: 173.55,
            invoiceType: "B",
            invoiceNumber: "00010-00000100",
            createdAt: new Date("2026-06-01T12:00:00.000Z"),
            sale: { branch: { name: "MACCELL 1", code: "M1" } },
        },
        {
            billingEntity: null,
            totalAmount: 2000,
            netAmount: 1652.89,
            vatAmount: 347.11,
            invoiceType: "B",
            invoiceNumber: "00010-00000105",
            createdAt: new Date("2026-06-02T12:00:00.000Z"),
            sale: { branch: { name: "MACCELL 2", code: "M2" } },
        },
        {
            billingEntity: "8BIT",
            totalAmount: 3000,
            netAmount: 2479.34,
            vatAmount: 520.66,
            invoiceType: "A",
            invoiceNumber: "00003-00000007",
            createdAt: new Date("2026-06-03T12:00:00.000Z"),
            sale: { branch: { name: "8 BIT ACCESORIOS", code: "8BIT" } },
        },
        {
            billingEntity: null,
            totalAmount: 4000,
            netAmount: 4000,
            vatAmount: 0,
            invoiceType: "X",
            invoiceNumber: "sin-numero",
            createdAt: new Date("2026-06-04T12:00:00.000Z"),
            sale: { branch: { name: "MACCELL 3", code: "M3" } },
        },
    ]);

    assert.deepEqual(ranges, [
        {
            entity: "MACCELL",
            salesPoint: 10,
            voucherType: 6,
            minVoucherNumber: 100,
            maxVoucherNumber: 105,
        },
        {
            entity: "8BIT",
            salesPoint: 3,
            voucherType: 1,
            minVoucherNumber: 7,
            maxVoucherNumber: 7,
        },
    ]);
});

test("builds debit VAT summary without subtracting local expenses as received VAT", () => {
    const summary = buildDebitVatSummary([
        {
            entity: "MACCELL",
            label: "MACCELL - 3 locales",
            count: 2,
            totalAmount: 1210,
            totalNet: 1000,
            totalVat: 210,
            branches: [],
        },
        {
            entity: "8BIT",
            label: "8 Bit Accesorios",
            count: 1,
            totalAmount: 605,
            totalNet: 500,
            totalVat: 105,
            branches: [],
        },
    ]);

    assert.deepEqual(summary, [
        {
            entity: "MACCELL",
            label: "MACCELL",
            debitVat: 210,
        },
        {
            entity: "8BIT",
            label: "8 Bit Accesorios",
            debitVat: 105,
        },
    ]);
});
