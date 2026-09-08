import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { publishInventory } from '../../../scripts/publish-schematic-inventory';
import { inventoryFormatProblem } from '../../lib/schematics/board-format';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';

test('completed inventory publication preserves verified metadata and backs up the legacy snapshot', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'inventory-publish-'));
  const a: SchematicAsset = { id: 'a', name: 'a.pdf', kind: 'pdf', model: 'PS5', modelKey: 'ps5', relativePath: 'sources/pdf/SONY/PS5/a.pdf', size: 12, sha256: 'a', status: 'ready' };
  try {
    await writeFile(path.join(root, 'catalog.json'), JSON.stringify({version:1,assets:[{...a,identityVerified:true}, {...a,id:'gone'}]}));
    await publishInventory(root, [a]);
    const saved = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
    assert.equal(saved.inventoryComplete, true);
    assert.deepEqual(saved.assets.map((asset: SchematicAsset) => asset.id), ['a']);
    assert.equal(saved.assets[0].identityVerified, true);
    assert.equal((await readdir(root)).some(name=>name.startsWith('catalog.json.before-inventory-')), true);
  } finally { await rm(root, {recursive:true,force:true}); }
});

test('a source menu saved with a board extension is rejected explicitly', () => {
  const menu = new TextEncoder().encode('{0}\u0000Xinzhizao Download and Install Redemption Code');
  assert.match(inventoryFormatProblem(menu, 'pcbe') ?? '', /catálogo de DZKJ/);
  assert.match(inventoryFormatProblem(new Uint8Array([0,12,4]), 'pdf') ?? '', /no es un PDF válido/);
  assert.equal(inventoryFormatProblem(new TextEncoder().encode('%PDF-1.7'), 'pdf'), undefined);
});
