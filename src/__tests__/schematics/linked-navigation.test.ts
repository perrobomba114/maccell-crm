import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readableReferenceZoom, compatibleCounterparts, containsReference, referencesInText, referenceOccurrences, validPdfBox } from '../../lib/schematics/linked-navigation';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';
const asset: SchematicAsset = { id: 'a', kind: 'pcbe', name: 'board', model: 'A125', modelKey: 'a125', brand: 'Samsung', boardCode: 'X123', revision: '1', identityVerified: true, relativePath: '', size: 1, sha256: '', status: 'ready' };
test('pairing only opens verified compatible opposite-kind ready assets', () => {
  const pdf: SchematicAsset = { ...asset, id: 'b', kind: 'pdf' };
  assert.deepEqual(compatibleCounterparts(asset, [pdf, { ...pdf, id: 'c', identityVerified: false }, { ...pdf, id: 'd', revision: '2' }, { ...pdf, id: 'e', status: 'locked' }, asset]), [pdf]);
  assert.equal(compatibleCounterparts(pdf, [asset]).length, 1);
  assert.equal(compatibleCounterparts(asset, [pdf, { ...pdf, id: 'c' }]).length, 2);
});
test('reference tokenization supports labels embedded in PDF text without prefix collisions', () => {
  const known = new Set(['U1', 'U10', 'PP_VDD_MAIN', 'PP1V8_S2', 'C20']);
  assert.deepEqual(referencesInText('R10 U10, (PP_VDD_MAIN) C20/PP1V8_S2', known), ['U10', 'PP_VDD_MAIN', 'C20', 'PP1V8_S2']);
  assert.equal(containsReference('U10', 'U1'), false);
  assert.equal(containsReference('U1: power', 'U1'), true);
  assert.equal(containsReference('PP_VDD_MAIN_A', 'PP_VDD_MAIN'), false);
});
test('occurrences retain measured coordinates and page-only evidence without inventing boxes', () => {
  const box = { text: 'U1', x: .1, y: .2, width: .04, height: .02 };
  const matches = referenceOccurrences([{ page: 2, boxes: [box, { ...box, y: .6 }, { ...box, text: 'U10' }] }, { page: 8 }, { page: 9, boxes: [{ ...box, x: 2 }] }], 'U1');
  assert.equal(matches.length, 4);
  assert.deepEqual(matches[0].box, box);
  assert.equal(matches[1].box?.y, .6);
  assert.equal(matches[2].box, undefined);
  assert.equal(matches[3].box, undefined);
  assert.equal(validPdfBox({ ...box, height: NaN }), false);
  assert.equal(validPdfBox({ ...box, x: .99 }), false);
});

test('PDF reference focus reaches readable text without reducing user zoom', () => {
  assert.equal(readableReferenceZoom(1, .002, 1000), 7);
  assert.equal(readableReferenceZoom(9, .002, 9000), 9);
  assert.equal(readableReferenceZoom(1, .0001, 1000), 12);
  assert.equal(readableReferenceZoom(2, 0, 1000), 2);
});
