import type { SchematicAsset } from "./catalog-types";
import { isCanonicalConsolePath } from "./published-assets";

export type ConsoleIdentity = { family: "Nintendo" | "PlayStation" | "Steam Deck" | "Xbox"; model: string };

const familyLabels: Record<string, ConsoleIdentity["family"]> = {
  nintendo: "Nintendo",
  playstation: "PlayStation",
  steamdeck: "Steam Deck",
  xbox: "Xbox",
};

export function consoleIdentityFromCanonicalPath(relativePath: string): ConsoleIdentity | null {
  if (!isCanonicalConsolePath(relativePath)) return null;
  const [, , rawFamily, model] = relativePath.replace(/\\/g, "/").split("/");
  const family = familyLabels[rawFamily?.toLowerCase() ?? ""];
  if (!family || !model || isNoiseModel(model)) return null;
  return { family, model };
}

export function isNoiseModel(value: string): boolean {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  return !normalized || /\.(?:pdf|pcbe|pcb)$/i.test(normalized)
    || /\b(?:pcb layer|schematic|diagram|layout|manual|notes|faq|trouble shooting|schematic and silk|general|component notes)\b/i.test(normalized);
}

export function publishedTreeIdentity(asset: SchematicAsset): ConsoleIdentity | null {
  return consoleIdentityFromCanonicalPath(asset.relativePath);
}
