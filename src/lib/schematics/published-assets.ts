import type { SchematicAsset } from "./catalog-types";
import { modelKey } from "./catalog-types";

export function publishedAssetIdentityKey(asset: Pick<SchematicAsset, "sha256" | "brand" | "model">): string {
  return `${asset.sha256}:${modelKey(asset.brand ?? "")}:${modelKey(asset.model)}`;
}

function normalize(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
}

export function isCanonicalConsolePath(relativePath: string): boolean {
  return /^(?:pcbe|pdf)\/Consolas\/(?:Nintendo|PlayStation|SteamDeck|Xbox)\//i.test(normalize(relativePath));
}

function presentationPriority(asset: SchematicAsset): [number, string] {
  const relativePath = normalize(asset.relativePath);
  const familyPriority = /^(?:pcbe|pdf)\//i.test(relativePath) ? 0 : relativePath.startsWith("sources/") ? 1 : 2;
  const canonicalConsolePenalty = relativePath.startsWith("Consolas/") ? 1 : 0;
  return [familyPriority + canonicalConsolePenalty, relativePath.toLocaleLowerCase("es")];
}

export function reconcilePublishedAssets(assets: readonly SchematicAsset[], existingPaths: ReadonlySet<string>): SchematicAsset[] {
  const normalizedPaths = new Set([...existingPaths].map(normalize));
  const best = new Map<string, SchematicAsset>();

  for (const asset of assets) {
    if (asset.status !== "ready" || !normalizedPaths.has(normalize(asset.relativePath))) continue;
    // One byte-identical document can legitimately be filed under more than
    // one device (for example, a shared iPhone 12/12 Pro boardview). A global
    // SHA key erased every other model from the technician tree. Collapse
    // duplicate download paths only within the same declared device.
    const identity = publishedAssetIdentityKey(asset);
    const previous = best.get(identity);
    if (!previous || comparePriority(asset, previous) < 0) best.set(identity, asset);
  }

  return [...best.values()];
}

function comparePriority(left: SchematicAsset, right: SchematicAsset): number {
  const [leftRank, leftPath] = presentationPriority(left);
  const [rightRank, rightPath] = presentationPriority(right);
  return leftRank - rightRank || leftPath.localeCompare(rightPath, "es", { numeric: true });
}
