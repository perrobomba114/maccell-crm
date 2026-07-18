import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panelSource = readFileSync(
    new URL("../app/admin/invoices/invoice-afip-control-panel.tsx", import.meta.url),
    "utf8"
);

test("labels period totals separately from the ARCA comparison sample", () => {
    assert.match(panelSource, /Local comparado/);
    assert.match(panelSource, /ARCA comparado/);
    assert.match(panelSource, /comprobantes del período/);
    assert.match(panelSource, /loadedSummary\.systemAmount/);
});
