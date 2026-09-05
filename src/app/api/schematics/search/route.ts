import { getCurrentUser } from "@/actions/auth-actions";
import { queryRag } from "@/lib/cerebro-v2/rag-db";
import { requestQueryEmbedding } from "@/lib/cerebro-v2/worker-client";
import { readCatalog, readSearchablePages } from "@/lib/schematics/catalog";
import { pairIsVerified } from "@/lib/schematics/pairing";
import {resolvePairings} from '@/lib/schematics/pairing-server';
import { lexicalPageMatches, validatedSemanticMatches } from "@/lib/schematics/search";

import { readRagModel, searchRagLibrary } from '@/lib/schematics/rag-library';

export const dynamic = "force-dynamic";
const MIN_SEMANTIC_SCORE = 0.5;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (!["ADMIN", "TECHNICIAN"].includes(user.role)) return Response.json({ error: "Acceso restringido" }, { status: 403 });
    const params = new URL(request.url).searchParams;
    const id = params.get("asset") ?? "";
    const query = params.get("q")?.trim() ?? "";
    if (query.length < 3 || query.length > 400) return Response.json({ error: "Escribí una consulta de 3 a 400 caracteres" }, { status: 400 });
    const catalog = await readCatalog();
    const selected = catalog.assets.find((asset) => asset.id === id);
    if (!selected) return Response.json({ error: "Seleccioná un equipo" }, { status: 400 });
    const indexedPages = await readSearchablePages(id);
    const verifiedIds=new Set((await resolvePairings(selected,catalog.assets)).verifiedIds);
    const lexical = lexicalPageMatches(selected, indexedPages, query,verifiedIds);
    if (!process.env.RAG_DATABASE_URL || !process.env.RAG_INTERNAL_API_SECRET) return Response.json({ matches: lexical, status: lexical.length ? "exact" : "insufficient", semantic: "not_configured" });
    if (lexical.length && /^[A-Za-z]+\d+[A-Za-z0-9_]*$|^PP[A-Za-z0-9_]+$/.test(query)) return Response.json({ matches: lexical, status: "exact", semantic: "not_needed" });
    const candidates = catalog.assets.filter((asset) => asset.kind === "pdf" && asset.status === "ready" && (asset.id === selected.id || pairIsVerified(selected, asset) || verifiedIds.has(asset.id)));
    let semantic;
    try {
      const model = await readRagModel(queryRag, process.env.SCHEMATICS_EMBEDDING_VERSION);
      if (!model || !candidates.length) return Response.json({ matches: lexical, status: lexical.length ? "exact" : "not_indexed", semantic: "not_indexed" });
      const embedding = await requestQueryEmbedding(query);
      const rag = await searchRagLibrary(queryRag, candidates, embedding, model, MIN_SEMANTIC_SCORE);
      semantic = validatedSemanticMatches(selected, candidates, rag.pages, rag.rows, lexical, MIN_SEMANTIC_SCORE, verifiedIds);
    } catch {
      console.error("[ESQUEMATICOS] Índice RAG compartido no disponible");
      return Response.json({ matches: lexical, status: lexical.length ? "exact" : "insufficient", semantic: "unavailable" });
    }
    const matches = [...lexical, ...semantic].slice(0, 20);
    return Response.json({ matches, status: semantic.length ? "semantic" : lexical.length ? "exact" : "insufficient" });
  } catch (error) {
    console.error("[ESQUEMATICOS] Búsqueda documental falló", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "La búsqueda documental no está disponible en este momento" }, { status: 503 });
  }
}
