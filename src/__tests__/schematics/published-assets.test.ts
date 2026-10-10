import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePublishedAssets } from "../../lib/schematics/published-assets";
import type { SchematicAsset } from "../../lib/schematics/catalog-types";

function asset(id: string, overrides: Partial<SchematicAsset> = {}): SchematicAsset {
  return {
    id,
    name: `${id}.pdf`,
    kind: "pdf",
    brand: "SONY",
    model: "PS5",
    modelKey: "ps5",
    relativePath: `pdf/Consolas/PlayStation/PS5/${id}.pdf`,
    size: 100,
    sha256: id.padEnd(64, "0"),
    status: "ready",
    ...overrides,
  };
}

test("prefers canonical console paths for equal hashes", () => {
  const sha256 = "a".repeat(64);
  const result = reconcilePublishedAssets([
    asset("old", { sha256, relativePath: "Consolas/PlayStation/guide.pdf" }),
    asset("new", { sha256, relativePath: "pdf/Consolas/PlayStation/PS5/guide.pdf" }),
  ], new Set(["Consolas/PlayStation/guide.pdf", "pdf/Consolas/PlayStation/PS5/guide.pdf"]));

  assert.deepEqual(result.map(item => item.id), ["new"]);
});

test("keeps equal names when hashes differ", () => {
  const result = reconcilePublishedAssets([
    asset("first", { name: "board.pcbe", kind: "pcbe", sha256: "a".repeat(64), relativePath: "pcbe/Consolas/Xbox/Series X/board-a.pcbe" }),
    asset("second", { name: "board.pcbe", kind: "pcbe", sha256: "b".repeat(64), relativePath: "pcbe/Consolas/Xbox/Series X/board-b.pcbe" }),
  ], new Set(["pcbe/Consolas/Xbox/Series X/board-a.pcbe", "pcbe/Consolas/Xbox/Series X/board-b.pcbe"]));

  assert.equal(result.length, 2);
});

test("keeps an equal hash when it belongs to a different commercial model", () => {
  const sha256 = "a".repeat(64);
  const result = reconcilePublishedAssets([
    asset("iphone-12", { sha256, brand: "APPLE", model: "iPhone 12", modelKey: "iphone12", relativePath: "sources/Iphone/iPhone 12/Pcbe/shared.pcbe" }),
    asset("iphone-12-mini", { sha256, brand: "APPLE", model: "iPhone 12 mini", modelKey: "iphone12mini", relativePath: "sources/Iphone/iPhone 12 mini/Pcbe/shared.pcbe" }),
  ], new Set(["sources/Iphone/iPhone 12/Pcbe/shared.pcbe", "sources/Iphone/iPhone 12 mini/Pcbe/shared.pcbe"]));

  assert.deepEqual(result.map(item => item.id).sort(), ["iphone-12", "iphone-12-mini"]);
});

test("keeps existing unsupported boards and locked PDFs visible with their original status", () => {
  const rows = [
    asset("board", { kind: "pcbe", status: "unsupported", detail: "Contenido no interpretable con el lector actual", relativePath: "sources/pcbe/Consolas/PlayStation/PS5/board.pcbe" }),
    asset("locked", { status: "locked", relativePath: "sources/pdf/Samsung/A03/guide.pdf" }),
  ];
  const result = reconcilePublishedAssets(rows, new Set(rows.map(row => row.relativePath)));
  assert.deepEqual(result, rows);
});

test("does not publish missing files or DZKJ menu downloads as technical documents", () => {
  const invalid = asset("menu", { status: "unsupported", detail: "La descarga contiene el catálogo de DZKJ, no el documento solicitado." });
  assert.deepEqual(reconcilePublishedAssets([invalid, asset("missing")], new Set([invalid.relativePath])), []);
});
