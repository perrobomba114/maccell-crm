import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import pg from "pg";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es requerida. Ejecutar con --env-file=.env.");
  const root = path.resolve(process.argv[2] ?? "upload/schematics");
  const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const asset of catalog.assets) {
      await client.query(`INSERT INTO schematics.assets(id, relative_path, sha256, kind, model_key, metadata)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET relative_path=excluded.relative_path,
        sha256=excluded.sha256,kind=excluded.kind,model_key=excluded.model_key,metadata=excluded.metadata,updated_at=now()`,
        [asset.id, asset.relativePath, asset.sha256, asset.kind, asset.modelKey, JSON.stringify(asset)]);
      if (asset.kind !== "pdf" || asset.status !== "ready") continue;
      const pages = JSON.parse(await readFile(path.join(root, ".index", `${asset.id}.json`), "utf8"));
      await client.query("DELETE FROM schematics.pages WHERE asset_id=$1", [asset.id]);
      for (const page of pages) {
        if (page.sha256 && page.sha256 !== asset.sha256) throw new Error(`Índice obsoleto para ${asset.relativePath}`);
        const content = page.text.replace(/\0/g, "");
        const contentSha256 = createHash("sha256").update(content).digest("hex");
        await client.query(`INSERT INTO schematics.pages(asset_id,asset_sha256,content_sha256,page_number,content,source) VALUES($1,$2,$3,$4,$5,$6)`, [asset.id, asset.sha256, contentSha256, page.page, content, page.source === "ocr" ? "ocr" : "text"]);
      }
    }
    await client.query("COMMIT");
    const result = await client.query("SELECT (SELECT count(*) FROM schematics.assets) AS assets, (SELECT count(*) FROM schematics.pages) AS pages");
    process.stdout.write(JSON.stringify(result.rows[0]) + "\n");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch((error) => { process.stderr.write((error instanceof Error ? error.message : "Error de indexación") + "\n"); process.exitCode = 1; });
