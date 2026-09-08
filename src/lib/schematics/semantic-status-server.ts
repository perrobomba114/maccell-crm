import 'server-only';
import { db } from '@/lib/db';
import { queryRag } from '@/lib/cerebro-v2/rag-db';
import { readCatalog } from './catalog';
import { readRagCoverage } from './rag-library';
import { readSemanticStatus, type CurrentSemanticPage } from './semantic-status';

export function readLibrarySemanticStatus() {
  return readSemanticStatus(process.env, {
    source: async () => {
      const [assets, pages] = await Promise.all([
        readCatalog(),
        db.$queryRaw<CurrentSemanticPage[]>`
          SELECT p.asset_id AS "assetId", p.asset_sha256 AS "assetSha256",
            p.page_number AS page, p.content_sha256 AS "contentSha256"
          FROM schematics.pages p JOIN schematics.assets a ON a.id=p.asset_id
          WHERE p.asset_sha256=a.sha256 AND p.content_sha256 IS NOT NULL AND length(trim(p.content))>30`,
      ]);
      return { assets: assets.assets.filter(asset=>asset.kind==='pdf'), pages };
    },
    vectors: (assets, model) => readRagCoverage(queryRag, assets, model),
  });
}
