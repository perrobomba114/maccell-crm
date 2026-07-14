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

test("accepts the final fenced JSON emitted after local model reasoning", () => {
    const facts = parseVisibleSchematicFacts([
        "```json",
        '{"visibleReferences":[],"visibleNets":[],"visibleTestPoints":[],"visibleConnectors":[],"readableNotes":["borrador"],"uncertainty":"alta"}',
        "```",
        "</think>",
        "```json",
        '{"visibleReferences":["U4000"],"visibleNets":["PP_VDD_MAIN"],"visibleTestPoints":[],"visibleConnectors":[],"readableNotes":["PMIC"],"uncertainty":"media"}',
        "```",
    ].join("\n"));

    assert.deepEqual(facts?.visibleReferences, ["U4000"]);
    assert.deepEqual(facts?.visibleNets, ["PP_VDD_MAIN"]);
});

test("normalizes a bounded numeric uncertainty emitted by a local vision model", () => {
    const facts = parseVisibleSchematicFacts(JSON.stringify({
        visibleReferences: [],
        visibleNets: [],
        visibleTestPoints: [],
        visibleConnectors: [],
        readableNotes: ["AP Decap"],
        uncertainty: 0.8,
    }));

    assert.equal(facts?.uncertainty, "Nivel relativo informado: 80%");
});
