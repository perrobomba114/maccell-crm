import test from 'node:test';
import assert from 'node:assert/strict';
import { runBounded, workerConcurrency } from '../../../scripts/technical-worker-queue';

test('bounded indexing processes each asset once and isolates a failing asset', async () => {
  let running = 0, maximum = 0;
  const seen: number[] = [];
  const result = await runBounded([1,2,3,4,5], 2, async (item) => {
    seen.push(item); running++; maximum = Math.max(maximum, running);
    await Promise.resolve(); running--;
    if (item === 2) throw new Error('broken PDF');
    return item;
  });
  assert.equal(maximum, 2);
  assert.deepEqual(seen.sort(), [1,2,3,4,5]);
  assert.equal(result.filter(item => item.status === 'rejected').length, 1);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 4);
});
test('shutdown finishes in-flight assets but does not start another extraction', async () => {
  const stop = new AbortController(), seen: number[] = [];
  await runBounded([1,2,3], 1, async item => { seen.push(item); stop.abort(); }, stop.signal);
  assert.deepEqual(seen, [1]);
});
test('invalid or excessive concurrency never creates an unbounded OCR pool', () => {
  assert.equal(workerConcurrency(undefined), 2);
  for (const value of ['0','-2','NaN','2.5']) assert.equal(workerConcurrency(value), 2);
  assert.equal(workerConcurrency('99'), 4);
  assert.equal(workerConcurrency('1'), 1);
});

test('cancelled extraction stops before reading a PDF or spawning OCR', async () => {
  const { extractTechnicalIndex } = await import('../../lib/schematics/technical-extractor');
  const stop = new AbortController(); stop.abort();
  await assert.rejects(extractTechnicalIndex({id:'a',name:'a.pdf',kind:'pdf',model:'x',modelKey:'x',relativePath:'a.pdf',size:1,sha256:'b',status:'ready'}, '/missing.pdf', [], stop.signal), error => error instanceof Error && error.name === 'AbortError');
});

test('connection loss cancels only its cycle, handles the error event and permits reconnect', async () => {
  const { EventEmitter } = await import('node:events');
  const { withIndexConnection } = await import('../../../scripts/technical-worker-queue');
  class Connection extends EventEmitter {
    destroyed = false;
    released = false;
    release(destroy = false) { this.destroyed = destroy; this.released = true; }
  }
  const stop = new AbortController();
  const failed = new Connection();
  const seen: number[] = [];
  await assert.rejects(withIndexConnection(failed, stop.signal, async signal => {
    await runBounded([1,2,3], 1, async item => {
      seen.push(item);
      failed.emit('error', new Error('connection lost while extracting'));
      assert.equal(signal.aborted, true);
    }, signal);
  }), /INDEX_CONNECTION_LOST/);
  assert.deepEqual(seen, [1]);
  assert.equal(stop.signal.aborted, false);
  assert.equal(failed.destroyed, true);
  assert.equal(failed.released, true);
  assert.equal(failed.listenerCount('error'), 0);
  const recovered = new Connection();
  assert.equal(await withIndexConnection(recovered, stop.signal, async signal => {
    assert.equal(signal.aborted, false); return 'reindexed';
  }), 'reindexed');
  assert.equal(recovered.released, true);
  assert.equal(recovered.destroyed, false);
});

test('process shutdown cancels active connection work without retaining error listeners', async () => {
  const { EventEmitter } = await import('node:events');
  const { withIndexConnection } = await import('../../../scripts/technical-worker-queue');
  const stop = new AbortController();
  const connection = Object.assign(new EventEmitter(), { release: () => {} });
  await assert.rejects(withIndexConnection(connection, stop.signal, async signal => {
    stop.abort(); assert.equal(signal.aborted, true);
  }), error => error instanceof Error && error.name === 'AbortError');
  assert.equal(connection.listenerCount('error'), 0);
});

test('explicit asset selection supports repeated/comma lists without widening the requested scope', async () => {
  const { selectIndexAssets } = await import('../../../scripts/technical-worker-queue');
  const assets = [{id:'a'}, {id:'b'}, {id:'c'}, {id:'d'}];
  assert.deepEqual(selectIndexAssets(assets, ['--asset=c,a', '--asset=a', '--asset=d']).map(asset => asset.id), ['a','c','d']);
  assert.throws(() => selectIndexAssets(assets, ['--asset=missing']), /No se encontró/);
  assert.throws(() => selectIndexAssets(assets, ['--asset=']), /vacía/);
  assert.throws(() => selectIndexAssets(assets, ['--asset', 'a']), /--asset=/);
});

test('priority changes start order while preserving all remaining catalog work', async () => {
  const { selectIndexAssets } = await import('../../../scripts/technical-worker-queue');
  const assets = [{id:'a'}, {id:'b'}, {id:'c'}, {id:'d'}];
  assert.deepEqual(selectIndexAssets(assets, ['--priority=c,a', '--priority=c']).map(asset => asset.id), ['c','a','b','d']);
  assert.deepEqual(selectIndexAssets(assets, ['--priority=missing']).map(asset => asset.id), ['a','b','c','d']);
  assert.deepEqual(selectIndexAssets(assets, []).map(asset => asset.id), ['a','b','c','d']);
  assert.deepEqual(assets.map(asset => asset.id), ['a','b','c','d']);
});
