import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { mergeOcrPage, type TechnicalIndex, type ReferenceBox } from "./unified-index";
import type { SchematicAsset } from "./catalog-types";

export async function databaseCatalog(): Promise<SchematicAsset[] | null> {
  const existing = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.assets')::text AS name`;
  if (!existing[0]?.name) return null;
  const rows = await db.$queryRaw<{ metadata: SchematicAsset }[]>`SELECT metadata FROM schematics.assets ORDER BY relative_path`;
  return rows.length ? rows.map((row) => row.metadata) : null;
}

export type IndexedPage = { page: number; text: string; source: "text" | "ocr" };

export async function databasePages(id: string, sha256?: string): Promise<IndexedPage[] | null> {
  const existing = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.pages')::text AS name`;
  if (!existing[0]?.name) return null;
  const rows = await db.$queryRaw<IndexedPage[]>`SELECT p.page_number AS page, p.content AS text, p.source
    FROM schematics.pages p
    WHERE p.asset_id=${id} AND (${sha256 ?? null}::text IS NULL OR p.asset_sha256=${sha256 ?? null}) ORDER BY p.page_number`;
  return rows.length ? rows : null;
}

export async function databaseSearchablePages(ids: string[]): Promise<Array<{ assetId: string; assetSha256: string; contentSha256: string | null; page: number; text: string; source: "text" | "ocr" }> | null> {
  if (!ids.length) return [];
  const existing = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.pages')::text AS name`;
  if (!existing[0]?.name) return null;
  return db.$queryRaw<Array<{ assetId: string; assetSha256: string; contentSha256: string | null; page: number; text: string; source: "text" | "ocr" }>>`
    SELECT p.asset_id AS "assetId", p.asset_sha256 AS "assetSha256", p.content_sha256 AS "contentSha256", p.page_number AS page, p.content AS text, p.source
    FROM schematics.pages p
    WHERE p.asset_id = ANY(${ids}::text[]) ORDER BY p.asset_id, p.page_number`;
}

export async function saveDatabaseOcrPage(assetId: string, assetSha256: string, page: number, text: string, boxes: ReferenceBox[] = [], fingerprint?: {mtimeMs:number;size:number}): Promise<boolean> {
  const existing = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.pages')::text AS name`;
  if (!existing[0]?.name) return false;
  await db.$transaction(async transaction => {
    const tables = await transaction.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.technical_indexes')::text AS name`;
    if (tables[0]?.name) {
      // A version-zero placeholder also invalidates an in-flight first extraction.
      const placeholder = JSON.stringify({version:1,complete:false,assetId,sha256:assetSha256,fileMtimeMs:fingerprint?.mtimeMs,fileSize:fingerprint?.size,pages:[],components:[],nets:[]});
      await transaction.$executeRaw`INSERT INTO schematics.technical_indexes(asset_id,asset_sha256,index_version,payload) VALUES(${assetId},${assetSha256},0,${placeholder}::jsonb) ON CONFLICT(asset_id) DO NOTHING`;
      const rows = await transaction.$queryRaw<{payload: TechnicalIndex; index_version: number; asset_sha256: string}[]>`SELECT payload,index_version,asset_sha256 FROM schematics.technical_indexes WHERE asset_id=${assetId} FOR UPDATE`;
      const row = rows[0];
      if (row && row.asset_sha256 === assetSha256) {
        const previous = row.payload.pages.find(item=>item.page===page);
        const merged = previous ? mergeOcrPage(previous,{page,text,source:'ocr',boxes}) : {page,text,source:'ocr' as const,boxes};
        text = merged.text;
        const payload = {...row.payload,pages:[...row.payload.pages.filter(item=>item.page!==page),merged].sort((a,b)=>a.page-b.page)};
        await transaction.$executeRaw`UPDATE schematics.technical_indexes SET payload=${JSON.stringify(payload)}::jsonb,updated_at=clock_timestamp() WHERE asset_id=${assetId}`;
        if (row.index_version !== 1) await transaction.$executeRaw`INSERT INTO schematics.index_jobs(asset_id,asset_sha256,status) VALUES(${assetId},${assetSha256},'pending') ON CONFLICT(asset_id) DO UPDATE SET status='pending',updated_at=clock_timestamp()`;
      }
    }
    const contentSha256 = createHash("sha256").update(text).digest("hex");
    await transaction.$executeRaw`INSERT INTO schematics.pages(asset_id,asset_sha256,content_sha256,page_number,content,source) VALUES(${assetId},${assetSha256},${contentSha256},${page},${text},'ocr')
      ON CONFLICT(asset_id,page_number) DO UPDATE SET asset_sha256=excluded.asset_sha256,content_sha256=excluded.content_sha256,content=excluded.content,source='ocr'`;
  });
  return true;
}

export async function saveDatabaseAssetIdentity(asset: SchematicAsset, expected: SchematicAsset): Promise<boolean> {
  const existing = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.assets')::text AS name`;
  if (!existing[0]?.name) return false;
  const metadata = JSON.stringify(asset);
  const previous = JSON.stringify(expected);
  const changed = await db.$executeRaw`UPDATE schematics.assets SET model_key=${asset.modelKey},metadata=${metadata}::jsonb,updated_at=now()
    WHERE id=${asset.id} AND metadata=${previous}::jsonb`;
  if (changed !== 1) throw new Error("IDENTITY_CONFLICT");
  return true;
}
