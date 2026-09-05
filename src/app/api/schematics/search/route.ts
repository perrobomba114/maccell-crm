import { getCurrentUser } from "@/actions/auth-actions";
import { queryRag } from "@/lib/cerebro-v2/rag-db";
import { requestQueryEmbedding } from "@/lib/cerebro-v2/worker-client";
import { readCatalog, readSearchablePages } from "@/lib/schematics/catalog";
import { verifiedSameDevice } from "@/lib/schematics/catalog-types";
import { lexicalPageMatches, validatedSemanticMatches, type SemanticRow } from "@/lib/schematics/search";

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
    const lexical = lexicalPageMatches(selected, indexedPages, query);
    const version = process.env.SCHEMATICS_EMBEDDING_VERSION;
    if (!process.env.RAG_DATABASE_URL || !process.env.RAG_INTERNAL_API_SECRET || !version) return Response.json({ matches: lexical, status: lexical.length ? "exact" : "insufficient" });
    const candidates = catalog.assets.filter((asset) => asset.kind === "pdf" && asset.status === "ready" && (asset.id === selected.id || verifiedSameDevice(selected, asset)));
    const currentPages = indexedPages.flatMap((page) => page.contentSha256 ? [{ asset_id: page.asset.id, asset_sha256: page.asset.sha256, page_number: page.page, content_sha256: page.contentSha256 }] : []);
    let rows: SemanticRow[];
    try {
      const table = await queryRag<{ name: string | null }>("SELECT to_regclass('schematics.chunks')::text AS name", []);
      if (!table[0]?.name) return Response.json({ matches: lexical, status: lexical.length ? "exact" : "not_indexed" });
      const embedding = await requestQueryEmbedding(query);
      rows = await queryRag<SemanticRow>(
        `SELECT asset_id,asset_sha256,content_sha256,page_number,content,source,1-(embedding <=> $1::vector) AS score
         FROM schematics.chunks AS chunk
         JOIN jsonb_to_recordset($4::jsonb) AS current(asset_id text,asset_sha256 text,page_number integer,content_sha256 text)
           ON current.asset_id=chunk.asset_id AND current.asset_sha256=chunk.asset_sha256
          AND current.page_number=chunk.page_number AND current.content_sha256=chunk.content_sha256
         WHERE chunk.embedding_model=$2 AND 1-(chunk.embedding <=> $1::vector) >= $3
         ORDER BY chunk.embedding <=> $1::vector LIMIT 20`,
        [`[${embedding.join(",")}]`, version, MIN_SEMANTIC_SCORE, JSON.stringify(currentPages)],
      );
    } catch (error) {
      console.error("[ESQUEMATICOS] Índice semántico no disponible", error instanceof Error ? error.message : "Error desconocido");
      return Response.json({ matches: lexical, status: lexical.length ? "exact" : "insufficient", semantic: "unavailable" });
    }
    const semantic = validatedSemanticMatches(selected, candidates, indexedPages, rows, lexical, MIN_SEMANTIC_SCORE);
    const matches = [...lexical, ...semantic].slice(0, 20);
    return Response.json({ matches, status: semantic.length ? "semantic" : lexical.length ? "exact" : "insufficient" });
  } catch (error) {
    console.error("[ESQUEMATICOS] Búsqueda documental falló", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "La búsqueda documental no está disponible en este momento" }, { status: 503 });
  }
}
