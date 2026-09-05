import { createHash } from "node:crypto";
import pg from "pg";
async function requestQueryEmbedding(text) {
  const response = await fetch(`${process.env.RAG_WORKER_URL ?? "http://maccell-rag-worker:8080"}/internal/embed`, {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RAG_INTERNAL_API_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }), signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`El worker no pudo generar embeddings (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.embedding) || data.embedding.length !== 1024 || data.embedding.some((v) => typeof v !== "number" || !Number.isFinite(v))) throw new Error("Embedding inválido");
  return data.embedding;
}

async function main() {
  if (!process.env.DATABASE_URL || !process.env.RAG_DATABASE_URL || !process.env.RAG_INTERNAL_API_SECRET) throw new Error("Se requieren DATABASE_URL, RAG_DATABASE_URL y RAG_INTERNAL_API_SECRET");
  const source = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const target = new pg.Pool({ connectionString: process.env.RAG_DATABASE_URL, max: 1 });
  try {
    await target.query(`CREATE SCHEMA IF NOT EXISTS schematics;
      CREATE TABLE IF NOT EXISTS schematics.chunks (
        id text PRIMARY KEY, asset_id text NOT NULL, asset_sha256 text NOT NULL,
        model_key text NOT NULL, page_number integer NOT NULL,
        content text NOT NULL, content_sha256 text, source text NOT NULL DEFAULT 'text', embedding vector(1024) NOT NULL,
        embedding_model text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      ); ALTER TABLE schematics.chunks ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'text';
      ALTER TABLE schematics.chunks ADD COLUMN IF NOT EXISTS content_sha256 text;
      CREATE INDEX IF NOT EXISTS schematic_chunks_model_idx ON schematics.chunks(model_key);`);
    const model = process.env.SCHEMATICS_EMBEDDING_VERSION;
    if (!model) throw new Error("Definí SCHEMATICS_EMBEDDING_VERSION con el modelo/version del worker RAG para versionar los vectores.");
    const pages = await source.query(`SELECT p.asset_id,p.asset_sha256 AS sha256,p.content_sha256,a.model_key,p.page_number,p.content,p.source FROM schematics.pages p JOIN schematics.assets a ON a.id=p.asset_id WHERE p.asset_sha256=a.sha256 AND p.content_sha256 IS NOT NULL AND length(trim(p.content))>30 ORDER BY p.asset_id,p.page_number`);
    let indexed = 0, cached = 0;
    for (const page of pages.rows) {
      for (let start = 0; start < page.content.length; start += 1500) {
        const content = page.content.slice(start, start + 1800);
        const id = createHash("sha256").update(`${model}:${page.asset_id}:${page.sha256}:${page.page_number}:${start}:${content}`).digest("hex");
        if ((await target.query("SELECT id FROM schematics.chunks WHERE id=$1", [id])).rowCount) {
          await target.query("UPDATE schematics.chunks SET asset_sha256=$2,content_sha256=$3,source=$4 WHERE id=$1", [id, page.sha256, page.content_sha256, page.source]);
          cached++; continue;
        }
        const embedding = await requestQueryEmbedding(content);
        await target.query(`INSERT INTO schematics.chunks(id,asset_id,asset_sha256,content_sha256,model_key,page_number,content,source,embedding,embedding_model) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10) ON CONFLICT(id) DO NOTHING`, [id, page.asset_id, page.sha256, page.content_sha256, page.model_key, page.page_number, content, page.source, `[${embedding.join(",")}]`, model]);
        indexed++;
        if (indexed % 20 === 0) process.stdout.write(`${indexed} fragmentos indexados\n`);
      }
    }
    process.stdout.write(JSON.stringify({ indexed, cached, model }) + "\n");
  } finally { await Promise.all([source.end(), target.end()]); }
}
main().catch((error) => { process.stderr.write((error instanceof Error ? error.message : "No se pudo indexar") + "\n"); process.exitCode = 1; });
