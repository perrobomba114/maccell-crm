import assert from "node:assert/strict";
import test from "node:test";
import { mergeCatalogAssets } from "../../lib/schematics/catalog-merge";
import type { SchematicAsset } from "../../lib/schematics/catalog-types";

function asset(id: string, overrides: Partial<SchematicAsset> = {}): SchematicAsset {
  return {
    id,
    name: `${id}.pdf`,
    kind: "pdf",
    brand: "Samsung",
    model: "SM-A125M",
    modelKey: "sma125m",
    relativePath: `pdf/Samsung/SM-A125M/${id}.pdf`,
    size: 100,
    sha256: id.padEnd(64, "0"),
    status: "ready",
    ...overrides,
  };
}

test("physical catalog remains complete when database catalog is partial", () => {
  const physical = [asset("a"), asset("b", { kind: "pcbe", name: "board.pcbe" })];
  const database = [asset("a", { identityVerified: true, aliases: ["Galaxy A12"] })];

  const merged = mergeCatalogAssets(physical, database);

  assert.deepEqual(merged.map((item) => item.id), ["a", "b"]);
  assert.equal(merged[0]?.identityVerified, true);
  assert.deepEqual(merged[0]?.aliases, ["Galaxy A12"]);
  assert.equal(merged[1]?.relativePath, physical[1]?.relativePath);
});

test("stale database paths cannot replace physical catalog paths", () => {
  const physical = asset("a", { relativePath: "pdf/Samsung/SM-A125M/current.pdf" });
  const database = asset("a", { relativePath: "pdf/Samsung/SM-A125M/old.pdf", sha256: "f".repeat(64) });

  const [merged] = mergeCatalogAssets([physical], [database]);

  assert.equal(merged?.relativePath, physical.relativePath);
  assert.equal(merged?.sha256, physical.sha256);
});
