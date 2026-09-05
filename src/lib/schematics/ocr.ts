import "server-only";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { SchematicAsset } from "./catalog-types";
import { libraryRoot } from "./catalog";
import { createHash } from "node:crypto";
import { parseOcrTsv, type TechnicalPage } from "./unified-index";
import { saveDatabaseOcrPage } from "./database";

const run = promisify(execFile);
const assetWrites = new Map<string, Promise<void>>();
let ocrQueue: Promise<void> = Promise.resolve();
export type OcrPage = TechnicalPage & { source: "ocr"; sha256: string };

async function commandAvailable(command: string): Promise<boolean> {
  try { await run(command, [command === "pdftoppm" ? "-v" : "--version"], { timeout: 5_000 }); return true; }
  catch { return false; }
}

export async function ocrLanguages(): Promise<{ requested: string[]; available: string[]; used: string[] }> {
  const requested = (process.env.SCHEMATICS_OCR_LANGUAGES ?? "spa+eng").split("+").filter(Boolean);
  const result = await run("tesseract", ["--list-langs"], { timeout: 5_000 });
  const available = result.stdout.split(/\r?\n/).map((value) => value.trim()).filter((value) => /^[a-z_]+$/i.test(value));
  const used = requested.filter((language) => available.includes(language));
  if (!used.length && available.includes("eng")) used.push("eng");
  if (!used.length) throw new Error(`No está instalado ninguno de los idiomas OCR solicitados: ${requested.join(", ")}`);
  return { requested, available, used };
}


export async function ocrAvailability(): Promise<{ available: boolean; missing: string[] }> {
  const checks = await Promise.all([commandAvailable("pdftoppm"), commandAvailable("tesseract")]);
  const missing = [checks[0] ? null : "poppler-utils", checks[1] ? null : "tesseract-ocr"].filter((item): item is string => Boolean(item));
  return { available: missing.length === 0, missing };
}

export async function readPdfPageCount(file: string): Promise<number> {
  const result = await run("pdfinfo", [file], { timeout: 10_000, maxBuffer: 1024 * 1024 });
  const match = result.stdout.match(/^Pages:\s+(\d+)\s*$/m);
  const pages = match ? Number(match[1]) : 0;
  if (!Number.isInteger(pages) || pages < 1) throw new Error("No se pudo determinar la cantidad de páginas del PDF");
  return pages;
}

async function saveLocalPage(asset: SchematicAsset, page: OcrPage): Promise<void> {
  const previous = assetWrites.get(asset.id) ?? Promise.resolve();
  const operation = previous.then(async () => {
    const indexPath = path.join(libraryRoot(), ".index", `${asset.id}.json`);
    const pendingPath = `${indexPath}.${process.pid}.pending`;
    await mkdir(path.dirname(indexPath), { recursive: true });
    let existing: Array<{ page: number; text: string; source?: "text" | "ocr"; sha256?: string }> = [];
    try { existing = JSON.parse(await readFile(indexPath, "utf8")) as typeof existing; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const current = existing.filter((entry) => entry.page !== page.page && (!entry.sha256 || entry.sha256 === asset.sha256));
    current.push(page);
    await writeFile(pendingPath, JSON.stringify(current.sort((a, b) => a.page - b.page)));
    await rename(pendingPath, indexPath);
  });
  assetWrites.set(asset.id, operation);
  try { await operation; } finally { if (assetWrites.get(asset.id) === operation) assetWrites.delete(asset.id); }
}

export async function recognizePdfPages(asset: SchematicAsset, file: string, pages: number[]): Promise<OcrPage[]> {
  if (asset.kind !== "pdf" || asset.status !== "ready") throw new Error("El archivo no admite OCR");
  const fingerprint = await stat(file);
  const originalBytes = await readFile(file);
  if (createHash("sha256").update(originalBytes).digest("hex") !== asset.sha256) throw new Error("El archivo cambió: actualizá el catálogo");
  const availability = await ocrAvailability();
  if (!availability.available) throw new Error(`OCR_RUNTIME_MISSING:${availability.missing.join(",")}`);
  const pageCount = await readPdfPageCount(file);
  if (pages.some((page) => page > pageCount)) throw new Error(`El PDF tiene ${pageCount} páginas`);
  const languages = (await ocrLanguages()).used;
  let releaseQueue: () => void = () => undefined;
  const previous = ocrQueue;
  ocrQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
  await previous;
  const output: OcrPage[] = [];
  let temporary: string | null = null;
  try {
    temporary = await mkdtemp(path.join(tmpdir(), "maccell-ocr-"));
    const snapshot = path.join(temporary,"source.pdf");
    await writeFile(snapshot,originalBytes);
    for (const page of pages) {
      const image = path.join(temporary, `page-${page}`);
      await run("pdftoppm", ["-f", String(page), "-l", String(page), "-singlefile", "-png", "-scale-to", "4000", snapshot, image], { timeout: 30_000, maxBuffer: 1024 * 1024 });
      const result = await run("tesseract", [`${image}.png`, "stdout", "-l", languages.join("+"), "tsv"], {timeout: 90_000, maxBuffer: 16 * 1024 * 1024});
      const recognized: OcrPage = {...parseOcrTsv(result.stdout,page),source:"ocr",sha256:asset.sha256};
      if (createHash("sha256").update(await readFile(file)).digest("hex") !== asset.sha256) throw new Error("El archivo cambió durante el reconocimiento; se conserva el índice anterior");
      if (recognized.text.trim()) {
        await saveDatabaseOcrPage(asset.id, asset.sha256, page, recognized.text, recognized.boxes, fingerprint);
        await saveLocalPage(asset, recognized);
      }
      output.push(recognized);
    }
    return output;
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    releaseQueue();
  }
}
