import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { SchematicAsset } from "./catalog-types";
import { modelKey } from "./catalog-types";

const FILE_PATTERN = /\.(?:pdf|pcb|pcbe)$/i;

async function walk(root: string): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const absolute = path.join(root, entry.name);
        if (entry.isDirectory()) files.push(...await walk(absolute));
        else if (entry.isFile() && FILE_PATTERN.test(entry.name)) files.push(absolute);
    }
    return files;
}

function declaredIdentity(relativePath: string, name: string): { brand?: string; model: string } {
    const parts = relativePath.split("/").filter(Boolean);
    const sourceIndex = parts[0]?.toLowerCase() === "sources" ? 1 : 0;
    const brand = parts[sourceIndex];
    const model = parts[sourceIndex + 1] ?? path.basename(name, path.extname(name));
    return { brand, model };
}

/** Reconciles the catalog with files that really exist in the mounted library. */
export async function discoverPhysicalAssets(root: string, previous: readonly SchematicAsset[]): Promise<SchematicAsset[]> {
    const byPath = new Map(previous.map((asset) => [asset.relativePath, asset]));
    const discovered: SchematicAsset[] = [];
    for (const absolute of await walk(root)) {
        const relativePath = path.relative(root, absolute).split(path.sep).join("/");
        const previousAsset = byPath.get(relativePath);
        const facts = await stat(absolute);
        if (previousAsset && previousAsset.size === facts.size) {
            discovered.push(previousAsset);
            continue;
        }
        const bytes = await readFile(absolute);
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        const name = path.basename(relativePath);
        const identity = declaredIdentity(relativePath, name);
        discovered.push({
            id: createHash("sha256").update(relativePath).digest("hex"),
            name,
            kind: path.extname(name).toLowerCase() === ".pdf" ? "pdf" : "pcbe",
            brand: identity.brand,
            model: identity.model,
            modelKey: modelKey(identity.model),
            relativePath,
            size: bytes.length,
            sha256,
            status: "ready",
        });
    }
    return discovered.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}
