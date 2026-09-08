import type { SchematicAsset } from "./catalog-types";

/**
 * The filesystem catalog is authoritative for which files exist. Database rows
 * may enrich those files with verified identity and parsed board facts, but a
 * partial database import must never hide physical catalog entries.
 */
export function mergeCatalogAssets(physical: SchematicAsset[], database: SchematicAsset[]): SchematicAsset[] {
  const databaseById = new Map(database.map((asset) => [asset.id, asset]));
  return physical.map((asset) => {
    const stored = databaseById.get(asset.id);
    if (!stored || stored.sha256 !== asset.sha256) return asset;

    return {
      ...stored,
      // The mounted catalog is the source of truth for the current physical
      // identity. Database metadata may contain verified enrichment, but an
      // old import must not make a board and its document look unrelated.
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      brand: asset.brand,
      model: asset.model,
      modelKey: asset.modelKey,
      relativePath: asset.relativePath,
      size: asset.size,
      sha256: asset.sha256,
      status: asset.status,
      detail: asset.detail,
    };
  });
}

/**
 * Combines the persisted catalog snapshot with the technical inventory.
 *
 * During bulk imports the JSON snapshot can lag behind the worker. In that
 * window the database is the only persisted list containing newly discovered
 * physical assets, so the UI must not hide those rows just because the JSON
 * file has not been rewritten yet. Shared ids still use the physical snapshot
 * as the identity source and database metadata only enriches it.
 */
export function mergeCatalogSources(catalog: SchematicAsset[], database: SchematicAsset[]): SchematicAsset[] {
  const catalogById = new Map(catalog.map((asset) => [asset.id, asset]));
  const databaseOnly = database
    .filter((asset) => !catalogById.has(asset.id))
    .slice()
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, "es", { numeric: true, sensitivity: "base" }));
  return [...mergeCatalogAssets(catalog, database), ...databaseOnly];
}
