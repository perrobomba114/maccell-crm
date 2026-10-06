#!/usr/bin/env node
/* Reconcile a one-to-one, hash-verified path manifest without changing IDs,
 * extracted pages, embeddings, repair history, chats or electrical pairings.
 * Run inside the CRM container, using its existing database configuration.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
const { Client } = pg;

const [mode, manifestPath, stateDir, root = process.env.SCHEMATICS_ROOT] = process.argv.slice(2);
if (!['audit', 'apply', 'verify', 'rollback'].includes(mode) || !manifestPath || !stateDir || !root) {
  throw new Error('Usage: reconcile-schematic-paths.mjs audit|apply|verify|rollback manifest state-dir SCHEMATICS_ROOT');
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const moves = manifest.entries.filter(r => r.asset_id && r.source !== r.target);
const byOld = new Map(moves.map(r => ['sources/' + r.source, r]));
const byNew = new Map(moves.map(r => ['sources/' + r.target, r]));
if (byNew.size !== moves.length || byOld.size !== moves.length) throw new Error('Manifest must be one-to-one');
const catalogPath = path.join(root, 'catalog.json');
const backupPath = path.join(stateDir, 'database-path-backup.json');
const catalogBackup = path.join(stateDir, 'catalog.before.json');
const receiptPath = path.join(stateDir, 'references-reconciled.json');
const main = new Client({ connectionString: process.env.DATABASE_URL });
const rag = new Client({ connectionString: process.env.RAG_DATABASE_URL });

function writeAtomic(file, data) {
  const temp = file + '.pending';
  fs.writeFileSync(temp, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(temp, file);
}

function updatedMetadata(original, item) {
  const relativePath = 'sources/' + item.target;
  const parts = item.target.split('/');
  const brand = parts.at(-3);
  const folderModel = parts.at(-2);
  const product = ['iPhone', 'iPad'].includes(brand) ? brand : null;
  const model = product && !['General', 'Por revisar'].includes(folderModel) ? product + ' ' + folderModel : folderModel;
  // Folder normalization does not verify electrical identity. Preserve the old
  // searchable identity for unresolved/general material rather than invent one.
  const normalizedBrand = ({ Apple: 'APPLE', iPhone: 'APPLE', iPad: 'APPLE', Honor: 'HUAWEI', 'Steam Deck': 'VALVE' })[brand] || brand.toUpperCase();
  const identity = item.review && !item.resetIdentity ? { brand: normalizedBrand } : {
    brand: normalizedBrand,
    model,
    modelKey: model.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, ''),
  };
  return { ...original, ...identity, relativePath, name: path.basename(relativePath),
    sourceRelativePath: original.sourceRelativePath || 'sources/' + item.source,
    normalizationBatch: manifest.batch, normalizationReview: item.review };
}

async function snapshot() {
  const assets = (await main.query('SELECT * FROM schematics.assets WHERE relative_path=ANY($1::text[])', [[...byOld.keys()]])).rows;
  const docs = (await rag.query("SELECT * FROM rag_documents WHERE source_type='PDF' AND relative_path=ANY($1::text[])", [moves.map(r => r.source)])).rows;
  const aliases = (await rag.query('SELECT * FROM rag_device_aliases WHERE source_path=ANY($1::text[])', [moves.map(r => r.source)])).rows;
  const counts = {};
  for (const table of ['pages', 'technical_indexes', 'repair_consultations', 'repair_entries']) {
    counts['schematics.' + table] = (await main.query('SELECT count(*)::int AS n FROM schematics.' + table)).rows[0].n;
  }
  for (const table of ['rag_pages', 'rag_chunks', 'rag_feedback', 'rag_chat_sessions']) {
    counts[table] = (await rag.query('SELECT count(*)::int AS n FROM ' + table)).rows[0].n;
  }
  return { batch: manifest.batch, assets, docs, aliases, counts,
    catalogSize: JSON.parse(fs.readFileSync(catalogPath, 'utf8')).assets.length };
}

async function preflight(backup) {
  if (backup.assets.length !== moves.length) throw new Error(`Catalog/DB mismatch: ${moves.length} catalog assets vs ${backup.assets.length} database assets`);
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const affectedCatalog = catalog.assets.filter(a => byOld.has(a.relativePath));
  if (affectedCatalog.length !== moves.length) throw new Error('Catalog changed after inventory');
  for (const asset of [...backup.assets.map(a => ({ ...a.metadata, id: a.id, relativePath: a.relative_path, sha256: a.sha256.trim() })), ...affectedCatalog]) {
    const item = byOld.get(asset.relativePath);
    if (!item || item.sha256 !== asset.sha256 || item.asset_id !== asset.id) throw new Error('Identity/hash mismatch: ' + asset.relativePath);
  }
  const occupied = (await main.query('SELECT relative_path FROM schematics.assets WHERE relative_path=ANY($1::text[])', [[...byNew.keys()]])).rows;
  if (occupied.length) throw new Error('Database target paths already occupied: ' + occupied.length);
  const newPdf = moves.filter(r => r.target.endsWith('.pdf')).map(r => r.target);
  const ragOccupied = (await rag.query("SELECT count(*)::int n FROM rag_documents WHERE source_type='PDF' AND source_id=ANY($1::text[])", [newPdf])).rows[0].n;
  if (ragOccupied) throw new Error('RAG destination identities already occupied');
}

async function updateMain(backup, reverse = false) {
  await main.query('BEGIN');
  try {
    for (const row of backup.assets) {
      const item = byOld.get(row.relative_path);
      const metadata = reverse ? row.metadata : updatedMetadata(row.metadata, item);
      const target = reverse ? row.relative_path : 'sources/' + item.target;
      const expected = reverse ? 'sources/' + item.target : row.relative_path;
      const result = await main.query(`UPDATE schematics.assets SET relative_path=$1,metadata=$2,model_key=$3,updated_at=now()
        WHERE id=$4 AND relative_path=$5 AND sha256=$6`, [target, metadata, reverse ? row.model_key : metadata.modelKey, row.id, expected, row.sha256]);
      if (result.rowCount !== 1) throw new Error('Concurrent asset update: ' + row.id);
    }
    await main.query('COMMIT');
  } catch (error) { await main.query('ROLLBACK'); throw error; }
}

async function updateRag(backup, reverse = false) {
  const lookup = new Map(moves.map(r => [r.source, r]));
  await rag.query('BEGIN');
  try {
    for (const row of backup.docs) {
      const item = lookup.get(row.relative_path);
      const target = reverse ? row.relative_path : item.target;
      const sourceId = reverse ? row.source_id : row.source_id === row.relative_path ? item.target : row.source_id;
      const metadata = reverse ? row.metadata : { ...row.metadata, sourceRelativePath: row.metadata?.sourceRelativePath || row.relative_path, normalizationBatch: manifest.batch };
      const expected = reverse ? item.target : row.relative_path;
      const result = await rag.query(`UPDATE rag_documents SET relative_path=$1,source_id=$2,metadata=$3,updated_at=now()
        WHERE id=$4 AND relative_path=$5`, [target, sourceId, metadata, row.id, expected]);
      if (result.rowCount !== 1) throw new Error('Concurrent RAG update: ' + row.id);
    }
    for (const row of backup.aliases) {
      const item = lookup.get(row.source_path);
      await rag.query('UPDATE rag_device_aliases SET source_path=$1,updated_at=now() WHERE id=$2', [reverse ? row.source_path : item.target, row.id]);
    }
    await rag.query('COMMIT');
  } catch (error) { await rag.query('ROLLBACK'); throw error; }
}

async function verify(backup) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const assets = (await main.query('SELECT id,relative_path,sha256 FROM schematics.assets WHERE id=ANY($1::text[])', [moves.map(r => r.asset_id)])).rows;
  const db = new Map(assets.map(a => [a.id, a]));
  let missing = 0;
  let checked = 0;
  for (const a of catalog.assets) {
    const item = byNew.get(a.relativePath), row = db.get(a.id);
    if (item) {
      if (!row || row.relative_path !== a.relativePath || row.sha256.trim() !== a.sha256 || item.asset_id !== a.id) throw new Error('Catalog/DB verification failed');
      checked++;
    }
    if (!fs.existsSync(path.join(root, a.relativePath))) missing++;
  }
  if (missing || checked !== moves.length || catalog.assets.length !== (backup.catalogSize ?? moves.length)) throw new Error('Missing physical assets: ' + missing);
  const docs = (await rag.query('SELECT id,relative_path FROM rag_documents WHERE id=ANY($1::uuid[])', [backup.docs.map(r => r.id)])).rows;
  const oldDocs = new Map(backup.docs.map(r => [r.id, r]));
  const lookup = new Map(moves.map(r => [r.source, r.target]));
  for (const doc of docs) if (doc.relative_path !== lookup.get(oldDocs.get(doc.id).relative_path)) throw new Error('RAG path verification failed');
  return { batch: manifest.batch, applied: true, catalog: catalog.assets.length, database: assets.length, ragDocuments: docs.length, missing };
}

(async () => {
  await main.connect(); await rag.connect();
  const locked = (await main.query('SELECT pg_try_advisory_lock(748193205) AS locked')).rows[0].locked;
  if (!locked) throw new Error('Technical worker is active; do not reorganize');
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  if (mode === 'audit') {
    const backup = await snapshot(); await preflight(backup);
    writeAtomic(path.join(stateDir, 'audit-before.json'), backup);
    console.log(JSON.stringify({ catalog: moves.length, assets: backup.assets.length, ragDocuments: backup.docs.length, aliases: backup.aliases.length, counts: backup.counts }));
  } else if (mode === 'apply') {
    if (fs.existsSync(backupPath) || fs.existsSync(catalogBackup)) throw new Error('Existing backup: inspect/resume explicitly; never overwrite');
    const backup = await snapshot(); await preflight(backup);
    for (const item of moves) {
      const oldFile = path.join(root, 'sources', item.source), newFile = path.join(root, 'sources', item.target);
      const oldStat = fs.statSync(oldFile), newStat = fs.statSync(newFile);
      if (oldStat.ino !== newStat.ino || oldStat.dev !== newStat.dev || oldStat.size !== item.size) throw new Error('Verified physical hard link required');
    }
    writeAtomic(backupPath, backup);
    fs.copyFileSync(catalogPath, catalogBackup, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(catalogBackup, 0o600);
    await updateMain(backup);
    try { await updateRag(backup); }
    catch (error) { await updateMain(backup, true); throw error; }
    const catalog = JSON.parse(fs.readFileSync(catalogBackup, 'utf8'));
    catalog.assets = catalog.assets.map(a => byOld.has(a.relativePath) ? updatedMetadata(a, byOld.get(a.relativePath)) : a);
    catalog.importedAt = new Date().toISOString();
    writeAtomic(catalogPath, catalog);
    fs.chmodSync(catalogPath, 0o644);
    const result = await verify(backup); writeAtomic(receiptPath, result); console.log(JSON.stringify(result));
  } else if (mode === 'verify') {
    console.log(JSON.stringify(await verify(JSON.parse(fs.readFileSync(backupPath, 'utf8')))));
  } else {
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    // Restore physical source links with the Python tool before this operation.
    for (const r of moves) if (!fs.existsSync(path.join(root, 'sources', r.source))) throw new Error('Restore original physical paths first');
    await updateRag(backup, true); await updateMain(backup, true);
    writeAtomic(catalogPath, JSON.parse(fs.readFileSync(catalogBackup, 'utf8'))); fs.chmodSync(catalogPath, 0o644);
    console.log(JSON.stringify({ restored: true, batch: manifest.batch }));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await main.end(); await rag.end();
});
