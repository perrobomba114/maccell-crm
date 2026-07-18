import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panelSource = readFileSync(
    new URL("../app/admin/invoices/invoice-afip-control-panel.tsx", import.meta.url),
    "utf8"
);
const summarySource = readFileSync(
    new URL("../app/admin/invoices/invoice-summary-cards.tsx", import.meta.url),
    "utf8"
);

test("labels reconciliation as the complete ARCA period instead of a sample", () => {
    assert.match(panelSource, /Período completo ARCA/);
    assert.match(panelSource, /Solo en local/);
    assert.match(panelSource, /Solo en ARCA/);
    assert.match(panelSource, /Completo/);
    assert.match(panelSource, /Incompleto/);
    assert.doesNotMatch(panelSource, /Muestra ARCA|muestra conciliada|Diferencia de la muestra/i);
});

test("uses unambiguous sales and debit VAT labels", () => {
    assert.match(summarySource, /Ventas facturadas/);
    assert.match(summarySource, /Neto gravado/);
    assert.match(summarySource, /IVA débito fiscal/);
    assert.match(summarySource, /Compras \/ crédito fiscal no integrados/);
});
