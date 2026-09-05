export type SchematicAsset = {
  id: string;
  name: string;
  kind: "pcbe" | "pdf";
  brand?: string;
  model: string;
  modelKey: string;
  boardCode?: string;
  revision?: string;
  aliases?: string[];
  identityVerified?: boolean;
  identityVerifiedBy?: string;
  identityVerifiedAt?: string;
  documentLinks?: Array<{ assetId: string; sha256: string; sourceSha256: string; confirmedBy: string; confirmedAt: string }>;
  identityVerificationHistory?: Array<{ verifiedBy: string; verifiedAt: string; brand: string; model: string; boardCode: string; revision: string; aliases: string[] }>;
  relativePath: string;
  size: number;
  sha256: string;
  status: "ready" | "locked" | "unsupported";
  detail?: string;
  components?: number;
  nets?: number;
};
export type SchematicCatalog = { version: 1; importedAt: string; assets: SchematicAsset[] };

export function modelKey(model: string): string {
  return model.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function identityKey(value: string | undefined): string {
  return modelKey(value ?? "");
}

function modelIdentities(asset: SchematicAsset): Set<string> {
  return new Set([asset.model, ...(asset.aliases ?? [])].map(identityKey).filter(Boolean));
}

export function sameDevice(a: SchematicAsset, b: SchematicAsset): boolean {
  const brandsMatch = !a.brand || !b.brand || identityKey(a.brand) === identityKey(b.brand);
  if (!brandsMatch) return false;
  const modelsMatch = [...modelIdentities(a)].some((value) => modelIdentities(b).has(value));
  if (!modelsMatch) return false;
  if (a.boardCode && b.boardCode && identityKey(a.boardCode) !== identityKey(b.boardCode)) return false;
  if ((a.revision && !b.revision) || (!a.revision && b.revision)) return false;
  return !a.revision || identityKey(a.revision) === identityKey(b.revision);
}

export function verifiedSameDevice(a: SchematicAsset, b: SchematicAsset): boolean {
  if (a.id === b.id) return true;
  if (!a.identityVerified || !b.identityVerified) return false;
  if (![a.brand, a.model, a.boardCode, a.revision, b.brand, b.model, b.boardCode, b.revision].every(Boolean)) return false;
  return sameDevice(a, b) && identityKey(a.boardCode) === identityKey(b.boardCode) && identityKey(a.revision) === identityKey(b.revision);
}
