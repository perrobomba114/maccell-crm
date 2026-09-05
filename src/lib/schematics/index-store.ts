import 'server-only';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/lib/db';
import { libraryRoot } from './catalog';
import type { SchematicAsset } from './catalog-types';
import { indexIsCurrent, indexFileIsCurrent, type TechnicalIndex } from './unified-index';

export async function readTechnicalIndex(asset: SchematicAsset): Promise<TechnicalIndex | null> {
  const root = await realpath(libraryRoot());
  const file = await realpath(path.join(root,asset.relativePath));
  if (!file.startsWith(root+path.sep)) throw new Error('Archivo fuera de la biblioteca');
  const physical = await stat(file);
  const tables = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.technical_indexes')::text AS name`;
  if (tables[0]?.name) {
    const rows = await db.$queryRaw<{ payload: TechnicalIndex }[]>`SELECT payload FROM schematics.technical_indexes WHERE asset_id=${asset.id} AND asset_sha256=${asset.sha256} AND index_version IN (0,1)`;
    if (indexIsCurrent(rows[0]?.payload ?? null, asset) && indexFileIsCurrent(rows[0].payload,physical)) return rows[0].payload;
  }
  try {
    const index = JSON.parse(await readFile(path.join(libraryRoot(), '.technical', `${asset.id}.json`), 'utf8')) as TechnicalIndex;
    return indexIsCurrent(index, asset) && indexFileIsCurrent(index,physical) ? index : null;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
export async function indexJob(asset: SchematicAsset) {
  const tables = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.index_jobs')::text AS name`;
  if (!tables[0]?.name) return null;
  const rows = await db.$queryRaw<{ status: string; error: string | null; attempts: number; updatedAt: Date }[]>`SELECT status,error,attempts,updated_at AS "updatedAt" FROM schematics.index_jobs WHERE asset_id=${asset.id} AND asset_sha256=${asset.sha256}`;
  return rows[0] ?? null;
}
export async function enqueueTechnicalIndex(asset: SchematicAsset) {
  await db.$executeRaw`INSERT INTO schematics.assets(id,relative_path,sha256,kind,model_key,metadata)
    VALUES(${asset.id},${asset.relativePath},${asset.sha256},${asset.kind},${asset.modelKey},${JSON.stringify(asset)}::jsonb) ON CONFLICT(id) DO NOTHING`;
  await db.$executeRaw`INSERT INTO schematics.index_jobs(asset_id,asset_sha256,status) VALUES(${asset.id},${asset.sha256},'pending')
    ON CONFLICT(asset_id) DO UPDATE SET asset_sha256=excluded.asset_sha256,status='pending',error=NULL,updated_at=now()
    WHERE schematics.index_jobs.status NOT IN ('pending','processing')`;
}

export async function hasPreviousTechnicalIndex(assetId: string): Promise<boolean> {
  const tables = await db.$queryRaw<{name:string|null}[]>`SELECT to_regclass('schematics.technical_indexes')::text AS name`;
  if (!tables[0]?.name) return false;
  const rows = await db.$queryRaw<{found:boolean}[]>`SELECT EXISTS(SELECT 1 FROM schematics.technical_indexes WHERE asset_id=${assetId}) AS found`;
  return rows[0]?.found ?? false;
}
