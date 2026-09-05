import assert from "node:assert/strict";
import test from "node:test";

import { canAccessRepairNotebook, parseRepairNotebookEntry } from "../../lib/schematics/repair-notebook";

test("allows only administrators and the technician assigned to the repair", () => {
  const repair = { assignedUserId: "tech-1" };
  assert.equal(canAccessRepairNotebook({ id: "admin", role: "ADMIN" }, repair), true);
  assert.equal(canAccessRepairNotebook({ id: "tech-1", role: "TECHNICIAN" }, repair), true);
  assert.equal(canAccessRepairNotebook({ id: "tech-2", role: "TECHNICIAN" }, repair), false);
  assert.equal(canAccessRepairNotebook({ id: "vendor", role: "VENDOR" }, repair), false);
});

test("accepts a finite measured value with bounded context", () => {
  assert.deepEqual(parseRepairNotebookEntry({
    kind: "measurement", evidence: "measured", assetId: "a".repeat(64),
    component: "U4000", pad: "A1", unit: "V", value: 3.82, note: "Equipo encendido",
  }), {
    kind: "measurement", evidence: "measured", assetId: "a".repeat(64), pdfAssetId: null,
    component: "U4000", pad: "A1", unit: "V", value: 3.82, note: "Equipo encendido",
    page: null, documentUrl: null,
  });
});

test("requires a PDF page for documented values", () => {
  assert.throws(() => parseRepairNotebookEntry({
    kind: "measurement", evidence: "documented", assetId: "a".repeat(64), unit: "V", value: 1.8,
  }), /PDF y la página/);
  assert.doesNotThrow(() => parseRepairNotebookEntry({
    kind: "measurement", evidence: "documented", assetId: "a".repeat(64),
    pdfAssetId: "b".repeat(64), page: 42, unit: "V", value: 1.8,
    documentUrl: "/technician/schematics?pdf=doc&page=42&repair=repair-1",
  }));
});

test("rejects non-finite values and unsafe or oversized fields", () => {
  assert.throws(() => parseRepairNotebookEntry({ kind: "measurement", evidence: "measured", assetId: "a".repeat(64), unit: "V", value: "Infinity" }), /finito/);
  assert.throws(() => parseRepairNotebookEntry({ kind: "note", evidence: "measured", assetId: "a".repeat(64), note: "x".repeat(2001) }), /2000/);
  assert.throws(() => parseRepairNotebookEntry({ kind: "note", evidence: "measured", assetId: "a".repeat(64), note: "ok", documentUrl: "https://example.com" }), /interno/);
});

test("parses Spanish decimal strings without coercing booleans, arrays or whitespace", () => {
  const parsed = parseRepairNotebookEntry({
    kind: "measurement", evidence: "measured", assetId: "a".repeat(64), unit: "V", value: "3,82",
  });
  assert.equal(parsed.value, 3.82);
  for (const value of [true, [], "   "]) {
    assert.throws(() => parseRepairNotebookEntry({
      kind: "measurement", evidence: "measured", assetId: "a".repeat(64), unit: "V", value,
    }), /valor/i);
  }
});
