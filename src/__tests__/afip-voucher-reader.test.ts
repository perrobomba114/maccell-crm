import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseAfipVoucherSummary } from "../actions/afip-voucher-response";

const voucherReaderSource = readFileSync(
    new URL("../actions/afip-voucher-period-reader.ts", import.meta.url),
    "utf8"
);

test("reads the authorization code returned by ARCA FECompConsultar", () => {
    assert.equal(parseAfipVoucherSummary({ CodAutorizacion: "12345678901234" })?.authorizationCode, "12345678901234");
    assert.equal(parseAfipVoucherSummary({ CAE: "12345678901234" })?.authorizationCode, "12345678901234");
});

test("parses the normalized ARCA SDK voucher response", () => {
    assert.deepEqual(
        parseAfipVoucherSummary({
            codAutorizacion: "12345678901234",
            cbteFch: "20260717",
            impTotal: 1210,
            impNeto: 1000,
            impIVA: 210,
        }),
        {
            authorizationCode: "12345678901234",
            voucherDate: new Date("2026-07-17T03:00:00.000Z"),
            total: 1210,
            net: 1000,
            vat: 210,
        }
    );
});

test("reports ARCA lookups that failed instead of hiding them", () => {
    assert.match(voucherReaderSource, /failedVoucherNumbers/);
    assert.doesNotMatch(voucherReaderSource, /MAX_SCAN_PER_RANGE_DEFAULT|120/);
});
