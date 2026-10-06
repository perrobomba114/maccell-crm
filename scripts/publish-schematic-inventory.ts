import { open, readFile, rename, rm, writeFile, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { SchematicAsset, SchematicCatalog } from '../src/lib/schematics/catalog-types';
import { mergeCatalogAssets } from '../src/lib/schematics/catalog-merge';

/** Publish only a completed physical scan, using the identity editor's lock. */
export async function publishInventory(root: string, assets: SchematicAsset[]): Promise<void> {
  const target = path.join(root, 'catalog.json');
  const lockPath = `${target}.identity.lock`;
  const lock = await open(lockPath, 'wx');
  const pending = `${target}.${process.pid}.pending`;
  try {
    let previous: SchematicAsset[] = [];
    try {
      const snapshot = JSON.parse(await readFile(target, 'utf8')) as SchematicCatalog;
      previous = snapshot.assets;
      if (!snapshot.inventoryComplete) await copyFile(target, `${target}.before-inventory-${Date.now()}`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const snapshot: SchematicCatalog = { version: 1, inventoryComplete: true, importedAt: new Date().toISOString(), assets: mergeCatalogAssets(assets, previous) };
    await writeFile(pending, JSON.stringify(snapshot));
    await rename(pending, target);
    // User-facing folders stay clean; operational inventory remains available to agents.
    const reports = path.join(root, 'sources', '.CATALOGO');
    try {
      await stat(reports);
      const quote = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
      const columns: (keyof SchematicAsset)[] = ['id','kind','brand','model','name','relativePath','sha256','size','status'];
      const csv = [columns.join(','), ...snapshot.assets.map(asset => columns.map(key => quote(asset[key])).join(','))].join('\n') + '\n';
      const report = path.join(reports, 'ARCHIVOS.csv');
      await writeFile(report + '.pending', csv);
      await rename(report + '.pending', report);
      const live = path.join(reports, 'INVENTARIO-ACTUAL.json');
      await writeFile(live + '.pending', JSON.stringify({scannedAt:snapshot.importedAt,assets:snapshot.assets.length,source:'catalog.json',note:'Inventario publicado; no acredita finalización de índices.'},null,2));
      await rename(live + '.pending', live);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }

  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
    await rm(pending, { force: true });
  }
}
