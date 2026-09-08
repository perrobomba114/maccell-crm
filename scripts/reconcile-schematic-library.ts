import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { discoverPhysicalAssets } from '../src/lib/schematics/physical-inventory';
import { publishInventory } from './publish-schematic-inventory';
import type { SchematicCatalog } from '../src/lib/schematics/catalog-types';

async function main() {
  const root = path.resolve(process.env.SCHEMATICS_ROOT ?? 'upload/schematics');
  const previous = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as SchematicCatalog;
  const assets = await discoverPhysicalAssets(root, previous.assets);
  await publishInventory(root, assets);
  process.stdout.write(JSON.stringify({ total: assets.length, pdf: assets.filter(a => a.kind === 'pdf').length,
    pcbe: assets.filter(a => a.kind === 'pcbe').length, unsupported: assets.filter(a => a.status !== 'ready').length }) + '\n');
}
main().catch(error => { process.stderr.write(String(error) + '\n'); process.exitCode = 1; });
