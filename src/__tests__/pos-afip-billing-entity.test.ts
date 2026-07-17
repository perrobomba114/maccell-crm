import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const checkoutSource = readFileSync(
    new URL("../actions/pos/checkout.ts", import.meta.url),
    "utf8"
);
const checkoutAfipSource = readFileSync(
    new URL("../actions/pos/checkout-afip.ts", import.meta.url),
    "utf8"
);

test("derives the POS fiscal entity from the authenticated branch and sends it explicitly to ARCA", () => {
    assert.match(checkoutSource, /normalizeFiscalEntityFromBranch\(caller\.branch\)/);
    assert.match(
        checkoutSource,
        /generateAfipInvoiceForSale\(data, safeBranchId, billingEntity\)/
    );
    assert.match(checkoutAfipSource, /billingEntity:\s*billingEntity/);
});
