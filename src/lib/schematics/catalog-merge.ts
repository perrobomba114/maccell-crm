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
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      relativePath: asset.relativePath,
      size: asset.size,
      sha256: asset.sha256,
      status: asset.status,
      detail: asset.detail,
    };
  });
}
