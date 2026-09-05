import { readFile } from "node:fs/promises";
import path from "node:path";

type SourceEntry = { name: string; lottery: string };
export async function loadSourceCatalog(source: string) {
  const entries: SourceEntry[] = [];
  for (const name of ["catalog-pcb-all.json", "catalog-pdf-all.json"]) {
    try { entries.push(...JSON.parse(await readFile(path.join(source, "../captures/catalog", name), "utf8")) as SourceEntry[]); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const normalize = (name: string) => name.replace(/\.pcbe?$/i, "").normalize("NFKC").toLowerCase();
  const byName = new Map<string, SourceEntry[]>();
  for (const entry of entries) { const key = normalize(entry.name); const bucket = byName.get(key) ?? []; bucket.push(entry); byName.set(key, bucket); }
  return (relative: string) => {
    if (!relative.startsWith("bulk/")) return relative;
    const matches = byName.get(normalize(path.basename(relative))) ?? [];
    const paths = [...new Set(matches.map((entry) => entry.lottery.replace(/^\{\d+\}\//, "").replace(/\.pcb$/i, ".pcbe")))];
    if (paths.length !== 1) return relative;
    const result = `pcbe/${paths[0]}`;
    if (result.split("/").some((part) => part === ".." || part === ".") || result.includes("\\")) throw new Error("Ruta de catálogo inválida");
    return result;
  };
}
