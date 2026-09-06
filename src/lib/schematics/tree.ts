import type { SchematicAsset } from "./catalog-types";

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

/**
 * Builds a hierarchical directory tree from a list of schematic assets.
 * Strips technical root prefixes ('pcbe' or 'pdf') so that top-level folders
 * are intuitive collections/brands (e.g. 'iPhone(VIP)', 'bulk', 'Samsung').
 */
export function buildDirectoryTree(assets: SchematicAsset[]): DirectoryNode[] {
  const root = createDirectoryNode("root", "");

  for (const asset of assets) {
    const rawParts = (asset.relativePath || "").replace(/\\/g, "/").split("/").filter(Boolean);
    if (!rawParts.length) continue;

    // Remove filename from directory segments
    const dirParts = rawParts.slice(0, -1);

    // If first segment is a technical type ('pcbe' | 'pdf') and there are deeper segments, strip it
    if (dirParts.length > 1 && (dirParts[0].toLowerCase() === "pcbe" || dirParts[0].toLowerCase() === "pdf")) {
      dirParts.shift();
    }

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
