import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePcbe } from "../../lib/schematics/pcbe";
import { parsePartRecord } from "../../lib/schematics/parts";
import { buildNetCatalog, hitTestCandidates } from "../../lib/schematics/boardview";
import { modelKey } from "../../lib/schematics/catalog-types";
import { findReferencePages } from "../../lib/schematics/references";

test("a truncated PCBE never invents geometry", () => {
  for (let length = 0; length < 68; length++) {
    const board = parsePcbe(new Uint8Array(length), "truncated.pcbe");
    assert.equal(board.validHeader, false); assert.deepEqual(board.geometry, []);
  }
});
test("malformed component name length is bounded before reading its bytes", () => {
  const bytes = new Uint8Array(30), view = new DataView(bytes.buffer);
  view.setUint32(0, 26, true); view.setUint32(22, 0xffffffff, true);
  assert.deepEqual(parsePartRecord(bytes, "part-1").geometry, []);
});
test("a truncated primitive is reported and not rendered", () => {
  const bytes = new Uint8Array(75), view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode("XZZPCB V1.0")); view.setUint32(64, 7, true);
  bytes[68] = 5; view.setUint32(69, 4000, true);
  const result = parsePcbe(bytes, "broken.pcbe");
  assert.deepEqual(result.geometry, []); assert.ok(result.warnings.some((w) => w.includes("truncado")));
});
test("net identity preserves sparse ids and does not equate identical names", () => {
  const nets = buildNetCatalog([
    { kind: "pin", layer: 29, x: 0, y: 0, radius: 1, name: "1", netIndex: 42 },
    { kind: "pin", layer: 29, x: 0, y: 0, radius: 1, name: "2", netIndex: null },
  ], [{ id: 7, name: "GND" }, { id: 42, name: "GND" }]);
  assert.deepEqual(nets.map((n) => [n.id, n.pinCount]), [[7, 0], [42, 1]]);
});
test("only visible layers participate in selection", () => {
  const geometry = [{ kind: "pin" as const, layer: 29, x: 10, y: 10, radius: 1, name: "1", netIndex: 42 }];
  assert.equal(hitTestCandidates(geometry, { x: 10, y: 10 }, { tolerance: 2, visibleLayerIds: new Set([1]) }).length, 0);
  assert.equal(hitTestCandidates(geometry, { x: 10, y: 10 }, { tolerance: 2, visibleLayerIds: new Set([29]) })[0].netId, 42);
});
test("PDF references do not confuse U4000 with U40001 or a net suffix", () => {
  const pages = [{ page: 1, text: "U40001 PP_VDD_MAIN_WLAN" }, { page: 2, text: "U4000 PP_VDD_MAIN" }];
  assert.deepEqual(findReferencePages(pages, "U4000").map((p) => p.page), [2]);
  assert.deepEqual(findReferencePages(pages, "PP_VDD_MAIN").map((p) => p.page), [2]);
});
test("regex characters in references are interpreted literally", () => {
  assert.equal(findReferencePages([{ page: 1, text: "A+B" }], "A+B").length, 1);
  assert.equal(findReferencePages([{ page: 1, text: "AAAB" }], "A+B").length, 0);
});
test("device matching keeps Pro, Pro Max and USA variants separate", () => {
  assert.notEqual(modelKey("iPhone15Pro"), modelKey("iPhone15ProMax"));
  assert.notEqual(modelKey("iPhone15ProMax(USA)"), modelKey("iPhone15ProMax"));
  assert.equal(modelKey("iPhone 15 Pro Max"), modelKey("iPhone15ProMAX"));
});
