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
    bulk: "Otros", downloads: "Otros", download: "Otros", incoming: "Otros",
  };
  return aliases[key] ?? (clean || "Otros");
}

function treeIdentity(asset: SchematicAsset): { brand: string; model: string; category: string } {
  const raw = (asset.relativePath || "").replace(/\\/g, "/").split("/").filter(Boolean).slice(0, -1);
  const parts = raw.filter(part => !TECHNICAL_FOLDERS.has(part.toLowerCase()));
  const brand = brandLabel(parts[0] ?? asset.brand ?? "Otros");
  const modelParts = parts.slice(1).filter(part => cleanLabel(part).toLowerCase() !== brand.toLowerCase());
  const model = (cleanLabel(modelParts.at(-1) ?? asset.model ?? "Modelo sin clasificar") || "Modelo sin clasificar");
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
