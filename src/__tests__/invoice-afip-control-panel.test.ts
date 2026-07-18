import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panelSource = readFileSync(
    new URL("../app/admin/invoices/invoice-afip-control-panel.tsx", import.meta.url),
    "utf8"
);

test("labels period totals separately from the ARCA comparison sample", () => {
    assert.match(panelSource, /Local total del período/);
    assert.match(panelSource, /Local comparado/);
    assert.match(panelSource, /ARCA comparado/);
    assert.match(panelSource, /Diferencia de la muestra/);
    assert.match(panelSource, /localSummary\.totalAmount/);
    assert.match(panelSource, /loadedSummary\.systemAmount/);
});

test("shows a clear reconciliation status without crowding the entity title", () => {
    assert.match(panelSource, /Muestra conciliada/);
    assert.match(panelSource, /Revisar diferencia en la muestra/);
    assert.match(panelSource, /Total período/);
    assert.match(panelSource, /Muestra ARCA/);
});
