import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { parsePcbe } from "../src/lib/schematics/pcbe";
import { modelKey, type SchematicAsset, type SchematicCatalog } from "../src/lib/schematics/catalog-types";
import { loadSourceCatalog } from "./schematic-source-catalog";

const require = createRequire(import.meta.url);
type PdfPage = { pageIndex: number; getTextContent(): Promise<{ items: { str?: string }[] }> };
const parsePdf = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer, options: { pagerender(page: PdfPage): Promise<string> }) => Promise<unknown>;

async function walk(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file));
    else if (entry.isFile() && /\.(pcb|pcbe|pdf)$/i.test(entry.name)) result.push(file);
  }
  return result.sort();
}

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Uso: npx tsx scripts/import-schematics.ts /ruta/downloads [destino]");
  const root = path.resolve(source);
  const destination = path.resolve(process.argv[3] ?? "upload/schematics");
  if (root === destination || destination.startsWith(root + path.sep)) throw new Error("El destino debe estar fuera de la biblioteca original");
  await mkdir(path.join(destination, ".index"), { recursive: true });
  const assets: SchematicAsset[] = [];
  const catalogPath = await loadSourceCatalog(root);
  let previous: SchematicAsset[] = [];
  try { previous = (JSON.parse(await readFile(path.join(destination, "catalog.json"), "utf8")) as SchematicCatalog).assets; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  for (const file of await walk(root)) {
    const relativePath = catalogPath(path.relative(root, file).split(path.sep).join("/"));
    const bytes = await readFile(file);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const id = createHash("sha256").update(relativePath).digest("hex");
    const kind = path.extname(file).toLowerCase() === ".pdf" ? "pdf" : "pcbe";
    const segments = relativePath.split("/");
    const brand = segments.length >= 4 ? segments[1] : undefined;
    const model = segments.length >= 4 ? segments[2] : path.basename(file, path.extname(file));
    const asset: SchematicAsset = { id, name: path.basename(file), kind, brand, model, modelKey: modelKey(model), relativePath, size: bytes.length, sha256, status: "ready" };
    const cached = previous.find((item) => item.sha256 === sha256 && item.kind === kind);
    const target = path.join(destination, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    try { await copyFile(file, target, constants.COPYFILE_EXCL); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = createHash("sha256").update(await readFile(target)).digest("hex");
      if (existing !== sha256) throw new Error(`Conflicto: ${relativePath}. El archivo existente se conserva.`);
    }
    if (cached) {
      const verified = cached.id === id ? { brand: cached.brand ?? brand, model: cached.model, modelKey: cached.modelKey, boardCode: cached.boardCode, revision: cached.revision, aliases: cached.aliases, identityVerified: cached.identityVerified, identityVerifiedBy: cached.identityVerifiedBy, identityVerifiedAt: cached.identityVerifiedAt, identityVerificationHistory: cached.identityVerificationHistory } : {};
      Object.assign(asset, { ...verified, status: cached.status, detail: cached.detail, components: cached.components, nets: cached.nets });
      if (kind === "pdf" && cached.id !== id && cached.status === "ready") await copyFile(path.join(destination, ".index", `${cached.id}.json`), path.join(destination, ".index", `${id}.json`));
      assets.push(asset);
      continue;
    }
    try {
      if (kind === "pcbe") {
        const board = parsePcbe(new Uint8Array(bytes), asset.name);
        asset.components = board.components.length; asset.nets = board.netCatalog.length;
        if (!board.validHeader || !board.geometry.length) { asset.status = "unsupported"; asset.detail = "Este formato todavía no contiene geometría decodificable por el visor."; }
      } else {
        const pages: { page: number; text: string; source: "text"; sha256: string }[] = [];
        await parsePdf(bytes, { pagerender: async (page) => {
          const text = (await page.getTextContent()).items.map((item) => item.str ?? "").join(" ");
          pages.push({ page: page.pageIndex + 1, text, source: "text", sha256 });
          return text;
        } });
        await writeFile(path.join(destination, ".index", `${id}.json`), JSON.stringify(pages.sort((a, b) => a.page - b.page)));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo leer";
      asset.status = /password|encrypted/i.test(message) ? "locked" : "unsupported";
      asset.detail = asset.status === "locked" ? "El PDF requiere contraseña para abrirse e indexarse." : "No se pudo interpretar el contenido del archivo.";
    }
    assets.push(asset);
    process.stdout.write(`${assets.length} ${asset.status} ${relativePath}\n`);
  }
  const currentPaths = new Set(assets.map((asset) => asset.relativePath));
  for (const asset of previous) if (!currentPaths.has(asset.relativePath) && !assets.some((item) => item.relativePath === catalogPath(asset.relativePath) && item.sha256 === asset.sha256)) { await stat(path.join(destination, asset.relativePath)); assets.push(asset); }
  const catalog: SchematicCatalog = { version: 1, importedAt: new Date().toISOString(), assets };
  await writeFile(path.join(destination, "catalog.pending.json"), JSON.stringify(catalog, null, 2));
  await rename(path.join(destination, "catalog.pending.json"), path.join(destination, "catalog.json"));
  process.stdout.write(JSON.stringify({ total: assets.length, ready: assets.filter((a) => a.status === "ready").length, locked: assets.filter((a) => a.status === "locked").length, unsupported: assets.filter((a) => a.status === "unsupported").length }) + "\n");
}
main().catch((error: unknown) => { process.stderr.write((error instanceof Error ? error.message : "Error de importación") + "\n"); process.exitCode = 1; });
