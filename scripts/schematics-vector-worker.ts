import pg from 'pg';
import { withIndexConnection } from './technical-worker-queue';
import { setTimeout as pause } from 'node:timers/promises';
import { indexVectorPage, semanticConfiguration, type VectorPage, type VectorStore } from './schematics-vector-page';

const lockId = 748193206;
const writeStatus = (client: pg.PoolClient, status: string, counters: object) => client.query(`INSERT INTO schematics.vector_worker_status(worker_key,status,counters) VALUES('schematics',$1,$2::jsonb)
  ON CONFLICT(worker_key) DO UPDATE SET status=excluded.status,counters=excluded.counters,updated_at=now()`, [status, JSON.stringify(counters)]);

async function prepare(client: pg.PoolClient) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS schematics;
    CREATE TABLE IF NOT EXISTS schematics.chunks (
      id text PRIMARY KEY, asset_id text NOT NULL, asset_sha256 text NOT NULL,
      model_key text NOT NULL, page_number integer NOT NULL,
      content text NOT NULL, content_sha256 text, source text NOT NULL DEFAULT 'text', embedding vector(1024) NOT NULL,
      embedding_model text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    ); ALTER TABLE schematics.chunks ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'text';
    ALTER TABLE schematics.chunks ADD COLUMN IF NOT EXISTS content_sha256 text;
    CREATE INDEX IF NOT EXISTS schematic_chunks_model_idx ON schematics.chunks(model_key);
    CREATE INDEX IF NOT EXISTS schematic_chunks_page_idx ON schematics.chunks(asset_id,page_number,embedding_model);
    CREATE TABLE IF NOT EXISTS schematics.vector_worker_status (
      worker_key text PRIMARY KEY, status text NOT NULL, counters jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
    );`);
}
function vectorStore(client: pg.PoolClient): VectorStore {
  return {
    existing: async (page, model) => new Set((await client.query<{ id: string }>('SELECT id FROM schematics.chunks WHERE asset_id=$1 AND page_number=$2 AND embedding_model=$3 AND asset_sha256=$4', [page.asset_id, page.page_number, model, page.sha256])).rows.map(row => row.id)),
    refresh: async (page, model, ids) => {
      await client.query(`UPDATE schematics.chunks SET content_sha256=$2,source=$3,model_key=$4 WHERE id=ANY($1::text[]) AND embedding_model=$5 AND (content_sha256 IS DISTINCT FROM $2 OR source IS DISTINCT FROM $3 OR model_key IS DISTINCT FROM $4)`, [ids,page.content_sha256,page.source,page.model_key,model]);
    },
    insert: async (chunk, page, model) => {
      await client.query(`INSERT INTO schematics.chunks(id,asset_id,asset_sha256,content_sha256,model_key,page_number,content,source,embedding,embedding_model)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10) ON CONFLICT(id) DO NOTHING`, [chunk.id,page.asset_id,page.sha256,page.content_sha256,page.model_key,page.page_number,chunk.content,page.source,`[${chunk.embedding.join(',')}]`,model]);
    },
  };
}
async function cycle(source: pg.Pool, target: pg.PoolClient, config: ReturnType<typeof semanticConfiguration>, signal: AbortSignal) {
  const acquired = (await target.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [lockId])).rows[0].locked;
  if (!acquired) return;
  const summary = { pages: 0, indexed: 0, cached: 0, failed: 0, model: config.model };
  try {
    await prepare(target);
    await writeStatus(target, 'processing', summary);
    const store = vectorStore(target);
    const embed = async (text: string) => {
      const response = await fetch(config.endpoint, {
        method: 'POST', headers: { Authorization: `Bearer ${config.secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({text}), signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      });
      if (!response.ok) throw new Error(`EMBED_HTTP_${response.status}`);
      const data: unknown = await response.json();
      const embedding = data && typeof data === 'object' && 'embedding' in data ? data.embedding : undefined;
      if (!Array.isArray(embedding) || embedding.length !== 1024 || embedding.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('EMBED_INVALID');
      return embedding as number[];
    };
    let cursor: [string, number] = ['', 0];
    while (!signal.aborted) {
      const pages = (await source.query<VectorPage>(`SELECT p.asset_id,p.asset_sha256 AS sha256,p.content_sha256,a.model_key,p.page_number,p.content,p.source
        FROM schematics.pages p JOIN schematics.assets a ON a.id=p.asset_id
        WHERE p.asset_sha256=a.sha256 AND p.content_sha256 IS NOT NULL AND length(trim(p.content))>30
          AND (p.asset_id,p.page_number)>($1::text,$2::integer)
        ORDER BY p.asset_id,p.page_number LIMIT 25`, cursor)).rows;
      if (!pages.length) break;
      for (const page of pages) {
        if (signal.aborted) break;
        cursor = [page.asset_id, page.page_number];
        try {
          await indexVectorPage(page, config.model, store, embed, signal, status => { summary[status]++; });
          summary.pages++;
        } catch {
          if (signal.aborted) break;
          summary.failed++;
          // Never serialize provider/connection errors: these can contain credentials or payloads.
          process.stderr.write(JSON.stringify({ worker: 'semantic', assetId: page.asset_id, page: page.page_number, status: 'failed', error: 'No se pudo indexar la página; se reintentará en el siguiente ciclo' }) + '\n');
        }
        await writeStatus(target, 'processing', summary);
      }
    }
    await writeStatus(target, signal.aborted ? 'stopped' : summary.failed ? 'partial' : 'idle', summary);
    process.stdout.write(JSON.stringify({worker:'semantic', ...summary}) + '\n');
    return summary.failed;
  } catch (error) {
    await writeStatus(target, 'failed', summary).catch(() => process.stderr.write('[SEMANTIC INDEX] No se pudo guardar el estado del ciclo fallido\n'));
    throw error;
  } finally { await target.query('SELECT pg_advisory_unlock($1)', [lockId]); }
}

export async function runSemanticWorker() {
  const config = semanticConfiguration(process.env);
  const stop = new AbortController();
  const abort = () => stop.abort();
  process.once('SIGTERM', abort); process.once('SIGINT', abort);
  const source = new pg.Pool({connectionString:config.source,max:1,connectionTimeoutMillis:10_000});
  const target = new pg.Pool({connectionString:config.target,max:1,connectionTimeoutMillis:10_000});
  const watch = process.argv.includes('--watch');
  // pg emits idle connection failures independently of query rejections.
  source.on('error', () => process.stderr.write('[SEMANTIC INDEX] Conexión de origen interrumpida\n'));
  target.on('error', () => process.stderr.write('[SEMANTIC INDEX] Conexión de destino interrumpida\n'));
  try {
    do {
      try {
        const client = await target.connect();
        const failures = await withIndexConnection(client, stop.signal, signal => cycle(source,client,config,signal));
        if (!watch && failures) throw new Error('Ciclo semántico parcial');
      }
      catch {
        if (!watch) throw new Error('El índice semántico no pudo completar el ciclo; verificá conectividad, permisos y extensión vector');
        process.stderr.write('[SEMANTIC INDEX] Falló el ciclo; se reintentará. Verificá conectividad, permisos y extensión vector\n');
      }
      if (!watch || stop.signal.aborted) break;
      try { await pause(30_000,undefined,{signal:stop.signal}); } catch (error) { if (!stop.signal.aborted) throw error; }
    } while (!stop.signal.aborted);
  } finally {
    process.removeListener('SIGTERM',abort); process.removeListener('SIGINT',abort);
    await Promise.allSettled([source.end(),target.end()]);
  }
}
