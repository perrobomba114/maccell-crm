import type pg from 'pg';
import { createHash } from 'node:crypto';
import type { SchematicAsset } from '../src/lib/schematics/catalog-types';
import type { TechnicalIndex } from '../src/lib/schematics/unified-index';

export async function persistTechnicalIndex(client: pg.PoolClient, asset: SchematicAsset, index: TechnicalIndex, expectedUpdatedAt: string | null) {
  await client.query('BEGIN');
  try {
    const saved = expectedUpdatedAt === null
      ? await client.query(`INSERT INTO schematics.technical_indexes(asset_id,asset_sha256,index_version,payload,file_mtime_ms,file_size) VALUES($1,$2,1,$3,$4,$5) ON CONFLICT(asset_id) DO NOTHING`, [asset.id,asset.sha256,JSON.stringify(index),index.fileMtimeMs,index.fileSize])
      : await client.query(`UPDATE schematics.technical_indexes SET asset_sha256=$2,index_version=1,payload=$3,file_mtime_ms=$5,file_size=$6,updated_at=clock_timestamp() WHERE asset_id=$1 AND updated_at=$4::timestamptz`, [asset.id,asset.sha256,JSON.stringify(index),expectedUpdatedAt,index.fileMtimeMs,index.fileSize]);
    if (saved.rowCount !== 1) throw new Error('INDEX_WRITE_CONFLICT: el índice cambió durante la extracción; se conserva la versión más reciente');
    if (asset.kind === 'pdf') {
      await client.query('DELETE FROM schematics.pages WHERE asset_id=$1', [asset.id]);
      for (const page of index.pages) {
        await client.query(`INSERT INTO schematics.pages(asset_id,asset_sha256,content_sha256,page_number,content,source) VALUES($1,$2,$3,$4,$5,$6)`, [asset.id, asset.sha256, createHash('sha256').update(page.text).digest('hex'), page.page, page.text, page.source]);
      }
    }
    await client.query(`UPDATE schematics.index_jobs SET status='indexed',error=NULL,updated_at=now() WHERE asset_id=$1 AND asset_sha256=$2`, [asset.id, asset.sha256]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
