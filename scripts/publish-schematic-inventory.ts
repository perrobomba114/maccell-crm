import { open, readFile, rename, rm, writeFile, copyFile } from 'node:fs/promises';
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
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
    await rm(pending, { force: true });
  }
}
