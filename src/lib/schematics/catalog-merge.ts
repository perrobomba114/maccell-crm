import type { SchematicAsset } from "./catalog-types";
import { modelKey } from "./catalog-types";
import { declaredIdentity } from "./physical-inventory";

function applyPhysicalIdentity(asset: SchematicAsset): SchematicAsset {
  const identity = declaredIdentity(asset.relativePath, asset.name);
  return {
    ...asset,
    brand: identity.brand,
    model: identity.model,
    modelKey: modelKey(identity.model),
  };
}

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

    return applyPhysicalIdentity({
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
    });
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
  // Once the technical inventory is larger than the import snapshot it is
  // the complete reconciled source. Catalog-only rows are then historical
  // leftovers and must not inflate the visible count. During the opposite
  // transition, keep the physical/catalog snapshot complete until the worker
  // catches up with it.
  if (database.length <= catalog.length) return mergeCatalogAssets(catalog, database);

  const catalogById = new Map(catalog.map((asset) => [asset.id, asset]));
  return database.map((asset) => {
    const snapshot = catalogById.get(asset.id);
    if (!snapshot || snapshot.sha256 !== asset.sha256) return applyPhysicalIdentity(asset);
    return applyPhysicalIdentity({
      ...snapshot,
      ...asset,
      identityVerified: asset.identityVerified ?? snapshot.identityVerified,
      identityVerifiedBy: asset.identityVerifiedBy ?? snapshot.identityVerifiedBy,
      identityVerifiedAt: asset.identityVerifiedAt ?? snapshot.identityVerifiedAt,
      aliases: asset.aliases ?? snapshot.aliases,
      documentLinks: asset.documentLinks ?? snapshot.documentLinks,
      identityVerificationHistory: asset.identityVerificationHistory ?? snapshot.identityVerificationHistory,
    });
  });
}
