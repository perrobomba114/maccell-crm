import { test } from "node:test";
import assert from "node:assert/strict";
import { selectionLayers, workspaceLink, readWorkspaceLink, clampPdfPage, shouldNavigateReference } from "../../lib/schematics/workspace";
import type { PcbeComponent } from "../../lib/schematics/types";

const parts: PcbeComponent[] = [{ id: "u1", name: "U1", kind: "IC", outlineCount: 0, pads: [
  { id: "p1", name: "1", componentId: "u1", layer: 29, x: 0, y: 0, radius: 1, netIndex: 0 },
] }];
test("external component focus activates the hidden side and net zero is preserved", () => {
  assert.deepEqual(selectionLayers(parts, "u1", null, [1]), [29]);
  assert.deepEqual(selectionLayers(parts, null, 0, [1]), [29]);
  assert.deepEqual(selectionLayers(parts, "missing", null, [1]), [1]);
});
test("workspace links roundtrip selection and reject invalid pages and assets", () => {
  const state = { board: "a".repeat(64), pdf: "b".repeat(64), page: 12, component: "U4000", net: "PP_VDD_MAIN", repair: "repair-1" };
  assert.deepEqual(readWorkspaceLink(new URL(workspaceLink(state), "http://localhost").searchParams), state);
  const invalid = readWorkspaceLink(new URLSearchParams("board=../bad&page=-1"));
  assert.equal(invalid.board, undefined); assert.equal(invalid.page, 1);
});
test("restoring or reindexing a reference preserves page; explicit selection navigates", () => {
  assert.equal(shouldNavigateReference(0, 0, "", ""), false);
  assert.equal(shouldNavigateReference(0, 1, "", ""), true);
  assert.equal(shouldNavigateReference(1, 1, "U1", "U2"), true);
  assert.equal(shouldNavigateReference(1, 1, "U2", "U2"), false);
  assert.equal(clampPdfPage(999, 8), 8);
  assert.equal(clampPdfPage(-1, 8), 1);
});
