import type { SchematicAsset } from "./catalog-types";
import { identityKey, verifiedSameDevice } from "./catalog-types";

export type CatalogKind = "all" | SchematicAsset["kind"];
export type CatalogQuery = { q?: string; kind: CatalogKind; page: number; pageSize: number };
export type PageSource = "text" | "ocr";
export type SearchMatch = { assetId: string; name: string; page: number; excerpt: string; score: number; source: PageSource };
export type SearchablePage = { asset: SchematicAsset; page: number; text: string; source: PageSource; contentSha256?: string | null };
export type SemanticRow = { asset_id: string; asset_sha256: string; content_sha256: string | null; page_number: number; content: string; score: number; source: PageSource };

function assetSearchText(asset: SchematicAsset): string {
  return identityKey([asset.brand, asset.model, asset.modelKey, asset.boardCode, asset.revision, asset.relativePath, ...(asset.aliases ?? []), asset.name].filter(Boolean).join(" "));
}

export function paginateCatalog(assets: SchematicAsset[], query: CatalogQuery) {
  const terms = (query.q ?? "").split(/\s+/).map(identityKey).filter(Boolean);
  const filtered = assets.filter((asset) => (query.kind === "all" || asset.kind === query.kind) && terms.every(term => assetSearchText(asset).includes(term)));
  const counts = {
    pcbe: filtered.filter((asset) => asset.kind === "pcbe").length,
    pdf: filtered.filter((asset) => asset.kind === "pdf").length,
  };
  const start = (query.page - 1) * query.pageSize;
  return { assets: filtered.slice(start, start + query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize, counts };
}

function excerpt(text: string, index: number, length: number): string {
  return text.slice(Math.max(0, index - 120), Math.min(text.length, index + length + 260)).trim();
}

export function lexicalPageMatches(selected: SchematicAsset, pages: SearchablePage[], query: string): SearchMatch[] {
  const terms = query.normalize("NFKC").trim().toLowerCase().split(/\s+/).filter((term) => term.length >= 2);
  if (!terms.length) return [];
  const seen = new Set<string>();
  return pages.flatMap(({ asset, page, text, source }) => {
    if (asset.status !== "ready" || (asset.id !== selected.id && !verifiedSameDevice(selected, asset))) return [];
    const normalized = text.normalize("NFKC").toLowerCase();
    const positions = terms.map((term) => normalized.indexOf(term));
    if (positions.some((position) => position < 0)) return [];
    const key = `${asset.id}:${page}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ assetId: asset.id, name: asset.name, page, excerpt: excerpt(text, Math.min(...positions), terms[0].length), score: 1, source }];
  }).slice(0, 50);
}

export function validatedSemanticMatches(selected: SchematicAsset, assets: SchematicAsset[], pages: SearchablePage[], rows: SemanticRow[], existing: SearchMatch[], minimumScore: number): SearchMatch[] {
  const seen = new Set(existing.map((match) => `${match.assetId}:${match.page}`));
  const currentDigests = new Map(pages.map((page) => [`${page.asset.id}:${page.page}`, page.contentSha256]));
  return rows.flatMap((row) => {
    const asset = assets.find((candidate) => candidate.kind === "pdf" && candidate.id === row.asset_id && candidate.sha256 === row.asset_sha256 && candidate.status === "ready" && (candidate.id === selected.id || verifiedSameDevice(selected, candidate)));
    const key = `${row.asset_id}:${row.page_number}`;
    if (!asset || !row.content_sha256 || row.content_sha256 !== currentDigests.get(key) || row.score < minimumScore || seen.has(key)) return [];
    seen.add(key);
    return [{ assetId: asset.id, name: asset.name, page: row.page_number, excerpt: row.content.slice(0, 700), score: row.score, source: row.source }];
  });
}
