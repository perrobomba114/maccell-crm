import assert from "node:assert/strict";
import test from "node:test";
import { mergeCatalogAssets, mergeCatalogSources } from "../../lib/schematics/catalog-merge";
import { sameDevice, type SchematicAsset } from "../../lib/schematics/catalog-types";

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

test("stale database identity cannot break a physical PCBE/PDF pair", () => {
  const physicalPdf = asset("a", {
    kind: "pdf",
    name: "A03S-96516_1_12 REV1.0 image.pdf",
    brand: "SAMSUNG",
    model: "A03s",
    modelKey: "a03s",
    relativePath: "sources/Samsung/Samsung A03s/Pdf/A03S-96516_1_12 REV1.0 image.pdf",
  });
  const staleDatabase = asset("a", {
    brand: "SAMSUNG",
    model: "A03s-96516_1_12 REV1.0 image",
    modelKey: "a03s96516112rev10image",
    aliases: ["old-import-label"],
    identityVerified: true,
  });

  const [merged] = mergeCatalogAssets([physicalPdf], [staleDatabase]);

  assert.equal(merged?.model, physicalPdf.model);
  assert.equal(merged?.modelKey, physicalPdf.modelKey);
  assert.equal(merged?.relativePath, physicalPdf.relativePath);
  assert.equal(merged?.identityVerified, true);
});

test("technical inventory additions remain visible while catalog json lags", () => {
  const catalog = [asset("a")];
  const database = [
    asset("a", { identityVerified: true }),
    asset("b", { relativePath: "sources/Samsung/SM-A035M/board.pcbe", kind: "pcbe", name: "board.pcbe" }),
  ];

  const merged = mergeCatalogSources(catalog, database);

  assert.deepEqual(merged.map((item) => item.id), ["a", "b"]);
  assert.equal(merged[0]?.identityVerified, true);
  assert.equal(merged[1]?.kind, "pcbe");
});

test("database-only legacy rows receive physical commercial identity before pairing", () => {
  const database = [
    asset("a", {
      kind: "pcbe",
      name: "A03s board.pcbe",
      brand: "SAMSUNG",
      model: "A series",
      modelKey: "aseries",
      relativePath: "sources/pcbe/SAMSUNG/A series(VIP)/A03s 96516/A03s board.pcbe",
    }),
    asset("b", {
      name: "A03s schematic.pdf",
      brand: "SAMSUNG",
      model: "A03s 96516",
      modelKey: "a03s96516",
      relativePath: "sources/pdf/SAMSUNG/A series(VIP)/A03s 96516/A03s schematic.pdf",
    }),
  ];

  const merged = mergeCatalogSources([], database);

  assert.deepEqual(merged.map((item) => item.modelKey), ["a03s", "a03s"]);
  assert.equal(sameDevice(merged[0]!, merged[1]!), true);
});

test("technical inventory suppresses catalog-only historical rows once complete", () => {
  const catalog = [asset("a"), asset("legacy")];
  const database = [asset("a"), asset("b", { kind: "pcbe", name: "board.pcbe" }), asset("c")];

  const merged = mergeCatalogSources(catalog, database);

  assert.deepEqual(merged.map((item) => item.id), ["a", "b", "c"]);
  assert.equal(merged.some((item) => item.id === "legacy"), false);
});
