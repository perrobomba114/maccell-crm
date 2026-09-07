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
