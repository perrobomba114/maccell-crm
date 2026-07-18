import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionSource = readFileSync(
    new URL("../lib/actions/admin-invoice.ts", import.meta.url),
    "utf8"
);
const formSource = readFileSync(
    new URL("../hooks/use-invoice-form.ts", import.meta.url),
    "utf8"
);

test("admin invoice action authenticates an administrator and derives protected fiscal fields", () => {
    assert.match(actionSource, /getCurrentUser/);
    assert.match(actionSource, /role\s*!==\s*["']ADMIN["']/);
    assert.doesNotMatch(actionSource, /data\.userId/);
    assert.doesNotMatch(actionSource, /data\.salesPoint/);
    assert.doesNotMatch(actionSource, /data\.billingEntity/);
});

test("admin invoice action records an idempotent attempt before requesting ARCA", () => {
    const attemptPosition = actionSource.indexOf("createEmissionAttempt");
    const arcaPosition = actionSource.indexOf("await createAfipInvoice");

    assert.ok(attemptPosition > -1);
    assert.ok(arcaPosition > -1);
    assert.ok(attemptPosition < arcaPosition);
    assert.match(actionSource, /AUTHORIZED_PENDING_SYNC/);
});

test("admin invoice form submits the operator-selected payment method", () => {
    assert.match(formSource, /paymentMethod,\s*setPaymentMethod/);
    assert.doesNotMatch(formSource, /paymentMethod:\s*["']CASH["']\s+as const/);
});
