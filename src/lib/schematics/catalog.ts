import "server-only";
import { readFile, realpath, open, rm, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { SchematicAsset, SchematicCatalog } from "./catalog-types";
import { databaseCatalog, databaseSearchablePages } from "./database";
import { mergeCatalogSources } from "./catalog-merge";
import { sameDevice } from "./catalog-types";
import type { SearchablePage } from "./search";
import { discoverPhysicalAssets } from "./physical-inventory";

export function libraryRoot(): string {
  return path.resolve(process.env.SCHEMATICS_ROOT ?? path.join(process.cwd(), "upload/schematics"));
}

export async function readCatalog(): Promise<SchematicCatalog> {
  let databaseAssets: SchematicAsset[] | null = null;
  try {
    databaseAssets = await databaseCatalog();
  } catch {
    databaseAssets = null;
  }

  try {
    const result = JSON.parse(await readFile(path.join(libraryRoot(), "catalog.json"), "utf8")) as SchematicCatalog;
    if (result.version !== 1 || !Array.isArray(result.assets)) throw new Error("Catálogo de esquemáticos inválido");
    // The technical worker can discover new files before the JSON snapshot is
    // rewritten. Use both persisted sources so a bulk upload is immediately
    // visible without recursively scanning thousands of files on every request.
    return databaseAssets ? { ...result, assets: mergeCatalogSources(result.assets, databaseAssets) } : { ...result, assets: await discoverPhysicalAssets(libraryRoot(), result.assets) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, importedAt: "", assets: await discoverPhysicalAssets(libraryRoot(), databaseAssets ?? []) };
    }
    throw error;
  }
}

export async function readCatalogPage(query: import("./search").CatalogQuery) {
  const { paginateCatalog } = await import("./search");
  return paginateCatalog((await readCatalog()).assets, query);
}

export async function resolveAsset(id: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const catalog = await readCatalog();
  const asset = catalog.assets.find((item) => item.id === id);
  if (!asset) return null;
  const root = await realpath(libraryRoot());
  const file = await realpath(path.join(root, asset.relativePath));
  if (!file.startsWith(root + path.sep)) throw new Error("Archivo fuera de la biblioteca");
  return { asset, file };
}

export async function readSearchablePages(selectedId: string): Promise<SearchablePage[]> {
  const catalog = await readCatalog();
  const selected = catalog.assets.find((asset) => asset.id === selectedId);
  if (!selected) return [];
  const assets = catalog.assets.filter((asset) => asset.kind === "pdf" && sameDevice(selected, asset));
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const databaseRows = await databaseSearchablePages([...byId.keys()]);
  if (databaseRows) return databaseRows.flatMap((row) => {
    const asset = byId.get(row.assetId);
    return asset && asset.sha256 === row.assetSha256 ? [{ asset, page: row.page, text: row.text, source: row.source, contentSha256: row.contentSha256 }] : [];
  });
  const groups = await Promise.all(assets.map(async (asset) => {
    try {
      const pages = JSON.parse(await readFile(path.join(libraryRoot(), ".index", `${asset.id}.json`), "utf8")) as Array<{ page: number; text: string; source?: "text" | "ocr"; sha256?: string }>;
      return pages.flatMap((page) => page.sha256 && page.sha256 !== asset.sha256 ? [] : [{ asset, page: page.page, text: page.text, source: page.source ?? "text" }]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }));
  return groups.flat();
}

export async function saveLocalCatalogIdentity(asset: SchematicAsset, expected: SchematicAsset): Promise<void> {
  const catalogPath = path.join(libraryRoot(), "catalog.json");
  const lockPath = `${catalogPath}.identity.lock`;
  const pending = `${catalogPath}.${randomUUID()}.pending`;
  const lock = await open(lockPath, "wx").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "EEXIST") throw new Error("IDENTITY_CONFLICT");
    throw error;
  });
  try {
    const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as SchematicCatalog;
    const index = catalog.assets.findIndex(candidate => candidate.id === asset.id);
    if (index < 0 || !isDeepStrictEqual(catalog.assets[index], expected)) throw new Error("IDENTITY_CONFLICT");
    catalog.assets[index] = asset;
    await writeFile(pending, JSON.stringify(catalog, null, 2));
    await rename(pending, catalogPath);
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
    await rm(pending, { force: true });
  }
}
