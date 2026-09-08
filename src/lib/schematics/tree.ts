import type { SchematicAsset } from "./catalog-types";
import { documentRole } from "./pairing";

export interface DirectoryNode {
  name: string;
  fullPath: string;
  subfolders: Map<string, DirectoryNode>;
  files: SchematicAsset[];
  totalFiles: number;
}

export function createDirectoryNode(name: string, fullPath: string): DirectoryNode {
  return {
    name,
    fullPath,
    subfolders: new Map(),
    files: [],
    totalFiles: 0,
  };
}

const TECHNICAL_FOLDERS = new Set([
  "sources", "pdf", "pcbe", "pcb", "schematic", "schematics", "repair case", "repair cases",
  "cases", "troubleshooting", "service", "manual", "documents", "documentos", "diode value",
  "schematic and boardview", "boardview", "board views", "images", "image",
]);

function cleanLabel(value: string): string {
  return value.replace(/\s*\((?:vip|free|premium|official|china|global)\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function brandLabel(value: string): string {
  const clean = cleanLabel(value);
  const key = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    apple: "Apple", iphone: "Apple", ipad: "Apple", ipod: "Apple",
    samsung: "Samsung", xiaomi: "Xiaomi", redmi: "Xiaomi", poco: "Xiaomi",
    motorola: "Motorola", moto: "Motorola", huawei: "Huawei", honor: "Honor",
    lg: "LG", oppo: "Oppo", vivo: "Vivo", realme: "Realme", oneplus: "OnePlus",
    nintendo: "Nintendo", playstation: "PlayStation", sony: "Sony", xbox: "Xbox",
    microsoft: "Microsoft", sega: "Sega", steamdeck: "Steam Deck", valve: "Valve",
    google: "Google", asus: "Asus", acer: "Acer", lenovo: "Lenovo", dell: "Dell", hp: "HP",
    msi: "MSI", infinix: "Infinix", tecno: "Tecno", itel: "Itel", meizu: "Meizu", nokia: "Nokia", zte: "ZTE",
    bulk: "Otros", downloads: "Otros", download: "Otros", incoming: "Otros",
  };
  if (aliases[key]) return aliases[key];
  const prefix = Object.entries(aliases).find(([alias]) => key.startsWith(alias) && key.length > alias.length);
  return prefix?.[1] ?? (clean || "Otros");
}

function canonicalBrand(asset: SchematicAsset, pathParts: string[]): string {
  const declared = cleanLabel(asset.brand ?? "");
  const declaredKey = declared.toLowerCase().replace(/[^a-z0-9]/g, "");
  const known = new Set([
    "apple", "iphone", "ipad", "ipod", "samsung", "xiaomi", "redmi", "poco", "motorola", "moto",
    "huawei", "honor", "lg", "oppo", "vivo", "realme", "oneplus", "nintendo", "playstation", "sony",
    "xbox", "microsoft", "sega", "steamdeck", "valve", "google", "asus", "acer", "lenovo", "dell", "hp", "msi", "infinix", "tecno", "itel", "meizu", "nokia", "zte",
  ]);
  if (known.has(declaredKey) || [...known].some((brand) => declaredKey.startsWith(brand) && declaredKey.length > brand.length)) return brandLabel(declared);
  const pathBrand = pathParts.find((part) => /^(?:apple|iphone|ipad|ipod|samsung|xiaomi|redmi|poco|motorola|moto|huawei|honor|lg|oppo|vivo|realme|oneplus|nintendo|playstation|sony|xbox|microsoft|sega|steam\s*deck|valve)\b/i.test(part));
  return brandLabel(pathBrand ?? "Otros");
}

function removeBrandPrefix(value: string, brand: string): string {
  // iPhone/iPad are commercial product names, not noise to remove from the
  // model label. Only the duplicated manufacturer prefix is discarded.
  const aliases = brand === "Apple" ? "apple" : brand.toLowerCase();
  return value.replace(new RegExp(`^(?:${aliases})\\b[\\s_-]*`, "i"), "").trim();
}

function samsungCommercialModel(value: string): string {
  // Keep hyphens because Samsung board codes use them (SM-A032F, GT-I9000).
  const clean = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const code = clean.match(/\b(?:SM|GT|SCH|SGH|SC|SHV)-?[A-Z0-9]+(?:-[A-Z0-9]+)*\b/i);
  if (!code) return clean;
  const before = clean.slice(0, code.index).trim();
  const familyMatches = [...before.matchAll(/\b(?:A|M|S|J|F|N|E|C|G|Z|X)\s*\d{1,3}(?:\s*(?:5G|4G|LTE|FE|PLUS|PRO|CORE|LITE|ULTRA|EDGE|ACTIVE|NEO|PRIME|NOTE))?/gi)];
  const family = familyMatches.at(-1)?.[0]?.replace(/\s+/g, " ").trim();
  if (family) {
    const suffix = before.slice((familyMatches.at(-1)?.index ?? 0) + familyMatches.at(-1)![0].length).match(/\b(?:5G|4G|LTE|FE|PLUS|PRO|CORE|LITE|ULTRA|EDGE|ACTIVE|NEO|PRIME)\b/gi);
    return [family, ...(suffix ?? [])].join(" ").replace(/\s+/g, " ").trim();
  }
  const note = before.match(/\bNote\s*\d+(?:\s+(?:LTE|FE|PLUS|ULTRA|PRO))?/i)?.[0];
  return note?.replace(/\s+/g, " ").trim() ?? code[0].replace(/-/g, "-");
}

function commercialModel(asset: SchematicAsset, brand: string, fallback: string): string {
  const declared = removeBrandPrefix(cleanLabel(asset.model || ""), brand);
  // Old catalog rows may not have a brand and can carry a model from the
  // generic mock/legacy identity. In that case the physical path is the
  // safer source for the tree grouping.
  const fallbackLabel = asset.brand ? removeBrandPrefix(cleanLabel(fallback), brand) : cleanLabel(fallback);
  const candidate = (asset.brand ? declared : "") || fallbackLabel || declared;
  const normalized = brand === "Samsung" ? samsungCommercialModel(candidate) : candidate;
  return normalized || "Modelo sin clasificar";
}

function treeIdentity(asset: SchematicAsset): { brand: string; model: string; category: string } {
  const raw = (asset.relativePath || "").replace(/\\/g, "/").split("/").filter(Boolean).slice(0, -1);
  const parts = raw.filter(part => !TECHNICAL_FOLDERS.has(part.toLowerCase()));
  const brand = canonicalBrand(asset, parts);
  const brandIndex = parts.findIndex((part) => brandLabel(part) === brand);
  const modelParts = (brandIndex >= 0 ? parts.slice(brandIndex + 1) : parts).filter(part => cleanLabel(part).toLowerCase() !== brand.toLowerCase());
  const model = commercialModel(asset, brand, modelParts.at(-1) ?? "Modelo sin clasificar");
  const role = documentRole(asset);
  const category = role === "board" ? "Placas" : role === "schematic" ? "Esquemáticos" : role === "repair" ? "Casos de reparación" : role === "accessory" ? "Accesorios" : "Documentos";
  return { brand, model, category };
}

/** Builds a stable presentation tree: brand -> commercial model -> document type. */
export function buildDirectoryTree(assets: SchematicAsset[]): DirectoryNode[] {
  const root = createDirectoryNode("root", "");

  for (const asset of assets) {
    if (!asset.relativePath) continue;
    const identity = treeIdentity(asset);
    const dirParts = [identity.brand, identity.model, identity.category];

    let current = root;
    let pathAcc = "";

    for (const segment of dirParts) {
      pathAcc = pathAcc ? `${pathAcc}/${segment}` : segment;
      let next = current.subfolders.get(segment);
      if (!next) {
        next = createDirectoryNode(segment, pathAcc);
        current.subfolders.set(segment, next);
      }
      current = next;
    }

    current.files.push(asset);
  }

  // Calculate recursive total file counts and sort children
  function finalize(node: DirectoryNode): number {
    let count = node.files.length;
    for (const sub of node.subfolders.values()) {
      count += finalize(sub);
    }
    node.totalFiles = count;
    return count;
  }

  finalize(root);

  // Return top-level nodes sorted alphabetically
  return Array.from(root.subfolders.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { numeric: true })
  );
}

/**
 * Checks whether a directory node or any of its descendants contains a given asset ID.
 */
export function nodeContainsAsset(node: DirectoryNode, targetId?: string): boolean {
  if (!targetId) return false;
  if (node.files.some((f) => f.id === targetId)) return true;
  for (const sub of node.subfolders.values()) {
    if (nodeContainsAsset(sub, targetId)) return true;
  }
  return false;
}
