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

const BRAND_PREFIXES: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /^(?:apple|iphone|ipad|ipod)\b/i, value: "APPLE" },
    { pattern: /^samsung\b/i, value: "SAMSUNG" },
    { pattern: /^(?:xiaomi|redmi|poco)\b/i, value: "XIAOMI" },
    { pattern: /^(?:huawei|honor)\b/i, value: "HUAWEI" },
    { pattern: /^motorola\b/i, value: "MOTOROLA" },
    { pattern: /^lg\b/i, value: "LG" },
    { pattern: /^oppo\b/i, value: "OPPO" },
    { pattern: /^vivo\b/i, value: "VIVO" },
    { pattern: /^realme\b/i, value: "REALME" },
    { pattern: /^oneplus\b/i, value: "ONEPLUS" },
    { pattern: /^nokia\b/i, value: "NOKIA" },
    { pattern: /^zte\b/i, value: "ZTE" },
];

const GENERIC_MODEL_FOLDERS = /^(?:[a-z]\s*series|vip|free|premium|official|china|global)$/i;

function cleanIdentityPart(value: string): string {
    return value.replace(/\s*\((?:vip|free|premium|official|china|global)\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function isBrandOnly(value: string): boolean {
    return /^(?:apple|iphone|ipad|ipod|samsung|xiaomi|redmi|poco|huawei|honor|motorola|lg|oppo|vivo|realme|oneplus|nokia|zte)$/i.test(cleanIdentityPart(value));
}

/**
 * Reduces noisy legacy folder labels to the commercial model used for pairing.
 * For Samsung, board codes and numeric archive ids are metadata, not separate
 * devices: `A03s`, `A03s SM-A037M` and `A03s 96516` must share `a03s`.
 */
export function commercialModel(value: string, brand?: string): string {
    let clean = cleanIdentityPart(value).replace(/[_]+/g, " ").trim();
    if (brand === "SAMSUNG") {
        clean = clean.replace(/^samsung\b[\s_-]*/i, "");
        const match = clean.match(/\b(?:A|M|S|J|F|N|E|C|G|Z|X)\s*\d{1,3}[a-z]?(?:\s+(?:5G|4G|LTE|FE|PLUS|PRO|CORE|LITE|ULTRA|EDGE|ACTIVE|NEO|PRIME))?/i);
        if (match) return match[0].replace(/\s+/g, " ").trim();
    }
    return clean;
}

/** Derives identity from physical path, independent of stale catalog metadata. */
export function declaredIdentity(relativePath: string, name: string): { brand?: string; model: string } {
    const parts = relativePath.split("/").filter(Boolean);
    const sourceIndex = parts[0]?.toLowerCase() === "sources" ? 1 : 0;
    const folders = parts.slice(sourceIndex, -1);
    const technicalFolder = /^(?:pdf|pcbe|pcb|schematic|schematics)$/i;
    const modelFolders = folders.filter((folder) => !technicalFolder.test(folder));
    const firstFolder = modelFolders[0];
    const fallbackModel = path.basename(name, path.extname(name));

    if (!firstFolder) return { model: fallbackModel };

    const prefixedBrand = BRAND_PREFIXES.find(({ pattern }) => pattern.test(firstFolder));
    const firstIsBrandOnly = isBrandOnly(firstFolder);

    // Both layouts are present in the mounted library:
    //   sources/Samsung/A72/Pdf/file.pdf
    //   sources/Samsung A15 5G SM-A1560/Pdf/file.pdf
    if (prefixedBrand) {
        const candidates = modelFolders.slice(firstIsBrandOnly ? 1 : 0).filter((folder) => !GENERIC_MODEL_FOLDERS.test(cleanIdentityPart(folder)));
        const model = candidates.at(-1) ?? path.basename(name, path.extname(name));
        return { brand: prefixedBrand.value, model: commercialModel(model, prefixedBrand.value) || model };
    }

    return { brand: firstFolder, model: commercialModel(firstFolder) || firstFolder };
}

/** Reconciles the catalog with files that really exist in the mounted library. */
export async function discoverPhysicalAssets(root: string, previous: readonly SchematicAsset[]): Promise<SchematicAsset[]> {
    const byPath = new Map(previous.map((asset) => [asset.relativePath, asset]));
    const discovered: SchematicAsset[] = [];
    for (const absolute of await walk(root)) {
        const relativePath = path.relative(root, absolute).split(path.sep).join("/");
        const previousAsset = byPath.get(relativePath);
        const facts = await stat(absolute);
        const name = path.basename(relativePath);
        const kind = path.extname(name).toLowerCase() === ".pdf" ? "pdf" : "pcbe";
        const identity = declaredIdentity(relativePath, name);
        if (previousAsset && previousAsset.size === facts.size) {
            // Physical folder identity is authoritative. Keep technical metadata from the
            // catalog, but never keep stale brand/model values after the folder layout changes.
            discovered.push({
                ...previousAsset,
                name,
                kind,
                brand: identity.brand,
                model: identity.model,
                modelKey: modelKey(identity.model),
                relativePath,
            });
            continue;
        }
        const bytes = await readFile(absolute);
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        discovered.push({
            id: createHash("sha256").update(relativePath).digest("hex"),
            name,
            kind,
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
