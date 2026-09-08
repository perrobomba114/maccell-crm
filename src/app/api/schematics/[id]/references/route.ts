import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/actions/auth-actions";
import { libraryRoot, readCatalog } from "@/lib/schematics/catalog";
import { databasePages } from "@/lib/schematics/database";
import { readTechnicalIndex, hasPreviousTechnicalIndex } from "@/lib/schematics/index-store";
import { indexReferenceMatches } from "@/lib/schematics/unified-index";
import { findReferencePages } from "@/lib/schematics/references";
import { queryRag } from "@/lib/cerebro-v2/rag-db";
import { currentReferenceFile, mergeReferenceMatches, readRagReferenceMatches } from "@/lib/schematics/rag-reference-pages";
import { nativeReferencePages } from "@/lib/schematics/native-reference-index";
import { searchSchematicReferences } from "@/lib/schematics/schematic-reference-search";
import {boardReferenceProfile} from "@/lib/schematics/board-reference-profile";
import {referenceNamespaceMismatch,officialLayoutPages} from "@/lib/schematics/reference-namespace";
import { sameDevice } from "@/lib/schematics/catalog-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (!["ADMIN", "TECHNICIAN"].includes(user.role)) return Response.json({ error: "Acceso restringido" }, { status: 403 });
    const id = (await context.params).id;
    const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!/^[a-f0-9]{64}$/.test(id) || term.length < 2 || term.length > 100) return Response.json({ error: "Referencia inválida" }, { status: 400 });
    const catalog = await readCatalog();
    const asset = catalog.assets.find((item) => item.id === id && item.kind === "pdf");
    if (!asset) return Response.json({ error: "PDF no encontrado" }, { status: 404 });
    if (asset.status !== "ready") return Response.json({ matches: [], status: asset.status });
    const technical = await readTechnicalIndex(asset);
    const boardId = new URL(request.url).searchParams.get('board');
    const board = catalog.assets.find(candidate=>candidate.id===boardId && candidate.kind==='pcbe' && candidate.status==='ready');
    if (board && sameDevice(board,asset)) {
      const profile = await boardReferenceProfile(board,libraryRoot());
      if (profile.nets.filter(name=>/^net\s*\d+$/i.test(name)).length > profile.nets.length * .9) {
        const native = await nativeReferencePages(asset,libraryRoot());
        const text = native.map(page=>page.text).join(' ');
        if (referenceNamespaceMismatch(profile.components,profile.nets,text)) return Response.json({
          matches:[],status:'mapping_required',
          referenceNames:[...new Set(text.toUpperCase().match(/\b[A-Z]{1,5}\d{3,5}\b/g) ?? [])],
          layoutPages:officialLayoutPages(native),
        });
      }
    }
    type ReferenceMatchItem = { page: number; excerpt: string; boxes?: import("@/lib/schematics/unified-index").ReferenceBox[] };
    let matches: ReferenceMatchItem[] = technical && technical.complete !== false ? indexReferenceMatches(technical.pages, term) : [];
    if (matches.some(match=>match.boxes?.length)) {
      return Response.json({
        matches,
        status: "indexed",
        sources: [...new Set(technical!.pages.map((page) => page.source))],
      });
    }
    const stale = !technical && (await hasPreviousTechnicalIndex(asset.id));
    let pages: { page: number; text: string; source?: "text" | "ocr"; sha256?: string }[] = technical?.pages ?? [];
    if (!matches.length && !stale) {
      try {
        const dbPages = await databasePages(id, asset.sha256);
        if (dbPages?.length) {
          pages = dbPages;
        } else {
          pages = JSON.parse(await readFile(path.join(libraryRoot(), ".index", `${id}.json`), "utf8"));
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    pages = pages.filter((page) => !("sha256" in page) || page.sha256 === asset.sha256);
    matches = matches.length ? matches : findReferencePages(pages, term);
    const sources = [...new Set(pages.map((page) => page.source ?? "text"))];
    // Native PDF references must work before the background OCR/RAG queue finishes.
    if (!matches.length || matches.every(match=>!match.boxes?.length)) {
      try {
        const native = await nativeReferencePages(asset,libraryRoot());
        matches = indexReferenceMatches(native,term);
        if (matches.length) return Response.json({matches,status:'indexed',sources:['text'],textIndex:'native_pdf'});
      } catch (error) {
        console.error('[ESQUEMATICOS] No se pudo extraer texto nativo',error instanceof Error ? error.message : 'Error');
      }
    }
    if (!matches.length && board && sameDevice(board,asset)) {
      const found = await searchSchematicReferences(board,asset.id,catalog.assets,term,async candidate=>{
        const indexed = await readTechnicalIndex(candidate);
        if (indexed?.pages.some(page=>page.text.trim())) return indexed.pages;
        try { return await nativeReferencePages(candidate,libraryRoot()); }
        catch (error) { console.error('[ESQUEMATICOS] Esquema alternativo sin texto legible',error instanceof Error ? error.message : 'Error');return []; }
      },request.signal);
      if (found) return Response.json({...found,status:'indexed',textIndex:'model_schematic'});
    }
    if (process.env.RAG_DATABASE_URL) {
      if (!await currentReferenceFile(asset, libraryRoot())) return Response.json({ matches: [], status: "stale" });
      try {
        const rag = await readRagReferenceMatches(queryRag, asset, term);
        if (rag) return Response.json({ matches: mergeReferenceMatches(matches, rag.matches), status: "indexed", sources: [...new Set([...sources, ...rag.sources])], textIndex: "existing_rag" });
      } catch {
        // A separate RAG outage must not discard available local references.
        console.error("[ESQUEMATICOS] Texto RAG no disponible para referencias; se conserva el índice local");
      }
    }
    return Response.json({ matches, status: technical ? "partial" : stale ? "stale" : !pages.length ? "not_indexed" : pages.some(p => p.text.trim()) ? "indexed" : "no_text", sources });
  } catch (error) {
    console.error("[ESQUEMATICOS] Búsqueda de referencias falló", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo buscar la referencia" }, { status: 500 });
  }
}
