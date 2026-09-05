import test from 'node:test';
import assert from 'node:assert/strict';
import { anchoredScroll, pdfRasterScale, fitPageZoom } from '../../lib/schematics/navigation';
test('PDF zoom preserves the document point under the cursor', () => {
  const next = anchoredScroll(400, 180, 1.5);
  assert.equal((next + 180 - 12) / 1.5, 400 + 180 - 12);
});
test('large PDF zoom stays within the raster memory and side budgets', () => {
  const scale = pdfRasterScale(20000, 30000, 2);
  assert.ok(20000 * 30000 * scale ** 2 <= 24000001);
  assert.ok(30000 * scale <= 16384);
});
test('fit page accounts for both viewport dimensions', () => {
  assert.equal(fitPageZoom(1000, 2000, 1000, 800, 2), .8);
});

test('zoom from a centered page to overflow preserves the same document point', () => {
  const result=anchoredScroll(0,750,2,250,12);
  assert.equal((result+750-12)/2,500);
});
