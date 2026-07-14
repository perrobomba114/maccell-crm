import assert from "node:assert/strict";
import test from "node:test";

import { formatVisibleSchematicFacts, parseVisibleSchematicFacts } from "@/lib/cerebro-v2/vision-analysis";

test("accepts only bounded structured visual facts", () => {
    const facts = parseVisibleSchematicFacts(JSON.stringify({
        visibleReferences: ["FL2201"],
        visibleNets: ["MIPI_D0_P"],
        visibleTestPoints: [],
        visibleConnectors: ["J2200"],
        readableNotes: ["DISPLAY"],
        uncertainty: "No se distingue el valor del filtro.",
    }));

    assert.ok(facts);
    assert.match(formatVisibleSchematicFacts(facts), /FL2201/);
});

test("rejects non JSON model prose", () => {
    assert.equal(parseVisibleSchematicFacts("Parece ser un filtro"), null);
});
