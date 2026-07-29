import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readVendorSales = (name: string) => readFileSync(
    new URL(`../app/vendor/sales/${name}`, import.meta.url),
    "utf8",
);

test("vendor sales exposes a dated cash closure reprint action", () => {
    const hook = readVendorSales("use-vendor-sales.ts");

    assert.match(hook, /getLatestVendorCashShiftForReprint/);
    assert.match(hook, /format\(date, "yyyy-MM-dd"\)/);
    assert.match(hook, /printCashShiftClosureTicket\(result\.data\)/);
    assert.match(hook, /isReprintingShift/);
    assert.match(hook, /handleReprintCashShift/);
});

test("vendor sales places the reprint button beside the filtered total", () => {
    const client = readVendorSales("sales-client.tsx");

    assert.match(client, /Reimprimir cierre/);
    assert.match(client, /Printer/);
    assert.match(client, /onClick=\{handleReprintCashShift\}/);
    assert.match(client, /disabled=\{isReprintingShift/);
});
