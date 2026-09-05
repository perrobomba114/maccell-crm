import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
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

export async function saveDatabaseOcrPage(assetId: string, assetSha256: string, page: number, text: string): Promise<boolean> {
  const existing = await db.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('schematics.pages')::text AS name`;
  if (!existing[0]?.name) return false;
  const contentSha256 = createHash("sha256").update(text).digest("hex");
  await db.$executeRaw`INSERT INTO schematics.pages(asset_id,asset_sha256,content_sha256,page_number,content,source) VALUES(${assetId},${assetSha256},${contentSha256},${page},${text},'ocr')
    ON CONFLICT(asset_id,page_number) DO UPDATE SET asset_sha256=excluded.asset_sha256,content_sha256=excluded.content_sha256,content=excluded.content,source='ocr'`;
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
