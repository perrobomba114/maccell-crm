import { createHash } from "node:crypto";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const [reportFile, catalogFile, root] = process.argv.slice(2);
if (!reportFile || !catalogFile || !root) throw new Error("Uso: node rewrite-schematic-catalog-after-normalization.mjs <reporte> <catalog.json> <SCHEMATICS_ROOT>");

const report = JSON.parse(await readFile(reportFile, "utf8"));
const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
const assets = Array.isArray(catalog.assets) ? catalog.assets : [];
const byPath = new Map(assets.map((asset) => [asset.relativePath, asset]));
const bySha = new Map(assets.map((asset) => [asset.sha256, asset]));
const sourceRoot = "/mnt/data2/";

function modelKey(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function idFor(relativePath) {
  return createHash("sha256").update(relativePath).digest("hex");
}

function metadataFromTarget(relativePath) {
  const parts = relativePath.split("/");
  const brand = parts[1];
  const model = parts[2] ?? path.basename(relativePath, path.extname(relativePath));
  const kind = parts.at(-2)?.toLowerCase() === "pdf" ? "pdf" : "pcbe";
  return { brand, model, modelKey: modelKey(model), kind };
}

let moved = 0;
let added = 0;
for (const item of report.moves) {
  const oldRelative = item.origin === "published"
    ? `sources/${path.relative(sourceRoot, item.source).split(path.sep).join("/")}`
    : null;
  const relativePath = `sources/${String(item.target).split(path.sep).join("/")}`;
  const metadata = metadataFromTarget(relativePath);
  const physical = path.join(root, relativePath);
  const physicalStat = await stat(physical);
  const existing = oldRelative ? byPath.get(oldRelative) : bySha.get(item.sha256);
  if (existing) {
    const updated = { ...existing, relativePath, name: path.basename(relativePath), size: physicalStat.size, sha256: item.sha256, ...metadata };
    byPath.delete(existing.relativePath);
    byPath.set(relativePath, updated);
    bySha.set(item.sha256, updated);
    if (oldRelative && oldRelative !== relativePath) moved++;
  } else if (!byPath.has(relativePath)) {
    const asset = {
      id: idFor(relativePath), name: path.basename(relativePath), ...metadata,
      relativePath, size: physicalStat.size, sha256: item.sha256, status: "ready",
    };
    byPath.set(relativePath, asset);
    bySha.set(item.sha256, asset);
    added++;
  }
}

const output = { ...catalog, importedAt: new Date().toISOString(), assets: [...byPath.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath)) };
const pending = `${catalogFile}.pending-normalization`;
await writeFile(pending, JSON.stringify(output, null, 2));
await rename(pending, catalogFile);
console.log(JSON.stringify({ before: assets.length, after: output.assets.length, moved, added }));
