import assert from "node:assert/strict";
import test from "node:test";
import { sameDevice, type SchematicAsset } from "../../lib/schematics/catalog-types";
import { lexicalPageMatches, paginateCatalog, validatedSemanticMatches } from "../../lib/schematics/search";

function asset(overrides: Partial<SchematicAsset> = {}): SchematicAsset {
  return {
    id: "a".repeat(64), name: "SM-A125M.pdf", kind: "pdf", brand: "Samsung",
    model: "SM-A125M", modelKey: "sma125m", relativePath: "pdf/Samsung/SM-A125M/file.pdf",
    size: 10, sha256: "b".repeat(64), status: "ready", ...overrides,
  };
}

test("sameDevice accepts aliases but rejects contradictory board revisions", () => {
  const base = asset({ boardCode: "A12_MAIN", revision: "REV 1.0", aliases: ["Galaxy A12"] });
  assert.equal(sameDevice(base, asset({ model: "Galaxy A12", modelKey: "galaxya12", boardCode: "A12 MAIN", revision: "rev1.0" })), true);
  assert.equal(sameDevice(base, asset({ boardCode: "A12_MAIN", revision: "REV 2.0" })), false);
  assert.equal(sameDevice(base, asset({ brand: "Motorola" })), false);
});

test("missing revision does not assert revision compatibility", () => {
  assert.equal(sameDevice(asset({ revision: "REV 1" }), asset()), false);
  assert.equal(sameDevice(asset(), asset()), true);
});

test("catalog search normalizes aliases, codes and paginates with total counts", () => {
  const assets = [asset({ aliases: ["Galaxy A12"] }), asset({ id: "c".repeat(64), kind: "pcbe", boardCode: "A12 MAIN", name: "board.pcbe" })];
  const result = paginateCatalog(assets, { q: "a12-main", kind: "all", page: 1, pageSize: 1 });
  assert.equal(result.total, 1);
  assert.equal(result.assets[0]?.kind, "pcbe");
  assert.deepEqual(result.counts, { pcbe: 1, pdf: 0 });
  assert.equal(paginateCatalog(assets, { q: "Samsung SM A125M", kind: "all", page: 1, pageSize: 40 }).total, 2);
});

test("semantic results reject weak, stale and cross-device evidence", () => {
  const selected = asset({ boardCode: "A12", revision: "1", identityVerified: true });
  const current = asset({ id: "2".repeat(64), sha256: "3".repeat(64), boardCode: "A12", revision: "1", identityVerified: true });
  const other = asset({ id: "4".repeat(64), sha256: "5".repeat(64), model: "SM-A135M", modelKey: "sma135m", boardCode: "A13", revision: "1", identityVerified: true });
  const pages = [
    { asset: current, page: 1, text: "valid", source: "ocr" as const, contentSha256: "valid-digest" },
    { asset: current, page: 2, text: "new text", source: "text" as const, contentSha256: "new-digest" },
    { asset: current, page: 3, text: "weak", source: "text" as const, contentSha256: "weak-digest" },
    { asset: other, page: 4, text: "wrong device", source: "text" as const, contentSha256: "other-digest" },
  ];
  const result = validatedSemanticMatches(selected, [current, other], pages, [
    { asset_id: current.id, asset_sha256: current.sha256, content_sha256: "valid-digest", page_number: 1, content: "valid", score: 0.72, source: "ocr" },
    { asset_id: current.id, asset_sha256: current.sha256, content_sha256: "old-digest", page_number: 2, content: "stale", score: 0.9, source: "text" },
    { asset_id: current.id, asset_sha256: current.sha256, content_sha256: "weak-digest", page_number: 3, content: "weak", score: 0.49, source: "text" },
    { asset_id: other.id, asset_sha256: other.sha256, content_sha256: "other-digest", page_number: 4, content: "wrong device", score: 0.99, source: "text" },
  ], [], 0.5);
  assert.deepEqual(result.map((match) => [match.page, match.source]), [[1, "ocr"]]);
});

test("lexical search stays within identity and deduplicates pages", () => {
  const selected = asset({ boardCode: "A12", revision: "1", identityVerified: true });
  const compatible = asset({ id: "d".repeat(64), sha256: "e".repeat(64), name: "service.pdf", boardCode: "A12", revision: "1", identityVerified: true });
  const incompatible = asset({ id: "f".repeat(64), sha256: "1".repeat(64), model: "SM-A135M", modelKey: "sma135m" });
  const matches = lexicalPageMatches(selected, [
    { asset: compatible, page: 3, text: "VBAT enters U4000 and feeds the PMIC", source: "ocr" },
    { asset: compatible, page: 3, text: "duplicate U4000", source: "text" },
    { asset: incompatible, page: 4, text: "U4000", source: "text" },
  ], "U4000");
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.source, "ocr");
});

test("legacy catalogs search brand/model terms independently of folder order", () => {
  const legacy = asset({ brand: undefined, relativePath: "pdf/Samsung(VIP)/SM-A125M/service/file.pdf" });
  assert.equal(paginateCatalog([legacy], { q: "Samsung A125M", kind: "all", page: 1, pageSize: 40 }).total, 1);
  assert.equal(paginateCatalog([legacy], { q: "A125M Samsung", kind: "all", page: 1, pageSize: 40 }).total, 1);
});
