import test from 'node:test';
import assert from 'node:assert/strict';
import { indexVectorPage, semanticConfiguration, type VectorStore, type VectorChunk } from '../../../scripts/schematics-vector-page';
const page = { asset_id: 'a', sha256: 'file', content_sha256: 'page-v1', model_key: 'phone', page_number: 1, content: 'a'.repeat(3200), source: 'text' };

test('semantic indexing resumes committed chunks after an embedding failure without losing existing vectors', async () => {
  const saved = new Map<string, VectorChunk>();
  const store: VectorStore = { existing: async () => new Set(saved.keys()), refresh: async () => {}, insert: async chunk => { saved.set(chunk.id, chunk); } };
  let calls = 0;
  const progress: string[] = [];
  await assert.rejects(indexVectorPage(page, 'model-v1', store, async () => {
    if (++calls === 2) throw new Error('embedding unavailable');
    return [1];
  }, undefined, status => { progress.push(status); }), /embedding unavailable/);
  assert.deepEqual(progress, ['indexed']);
  assert.equal(saved.size, 1);
  const resumed = await indexVectorPage(page, 'model-v1', store, async () => { calls++; return [1]; });
  assert.deepEqual(resumed, { indexed: 2, cached: 1 });
  assert.equal(saved.size, 3);
  assert.equal(calls, 4);
  const first = [...saved.values()][0];
  assert.equal(first.content.length, 1800);
  assert.equal([...saved.values()][2].content.length, 200);
});
test('semantic model changes require new embeddings and preserve old model vectors', async () => {
  const saved = new Map<string, VectorChunk>();
  const store: VectorStore = { existing: async () => new Set(saved.keys()), refresh: async () => {}, insert: async chunk => { saved.set(chunk.id, chunk); } };
  await indexVectorPage({...page, content: 'a'.repeat(50)}, 'old', store, async () => [1]);
  assert.deepEqual(await indexVectorPage({...page, content: 'a'.repeat(50)}, 'new', store, async () => [1]), { indexed: 1, cached: 0 });
  assert.equal(saved.size, 2);
});
test('semantic worker reports missing variable names without echoing secrets and rejects unsafe endpoint schemes', () => {
  assert.throws(() => semanticConfiguration({DATABASE_URL:'private-secret'}), error => error instanceof Error && !error.message.includes('private-secret') && error.message.includes('RAG_DATABASE_URL'));
  assert.throws(() => semanticConfiguration({DATABASE_URL:'db',RAG_DATABASE_URL:'rag',RAG_INTERNAL_API_SECRET:'secret',SCHEMATICS_EMBEDDING_VERSION:'v1',RAG_WORKER_URL:'file:///tmp/secret'}), /HTTP/);
});

test('startup launches semantic catch-up only with complete configuration', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const directory = await mkdtemp(path.join(tmpdir(), 'schematics-startup-'));
  const log = path.join(directory, 'calls');
  try {
    await writeFile(path.join(directory, 'node'), `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(process.env.STARTUP_TEST_LOG, process.argv.slice(2).join(' ') + '\\n');
if (process.argv.includes('migrate') && process.env.STARTUP_TEST_FAIL_MIGRATION) process.exit(1);
if (process.argv.includes('scripts/register-schematic-additions.mjs') && process.env.STARTUP_TEST_FAIL_IMPORT) process.exit(1);
if (process.argv.includes('server.js')) setTimeout(() => process.exit(0), 200);
else if (process.argv.includes('--watch')) { const timer = setInterval(() => {}, 1000); process.on('SIGTERM', () => { clearInterval(timer); process.exit(0); }); }
`, {mode:0o755});
    for (const configured of [false, true]) {
      await writeFile(log, '');
      const env = {...process.env, PATH: `${directory}:${process.env.PATH}`, STARTUP_TEST_LOG: log,
        DATABASE_URL: 'test-db', RAG_DATABASE_URL: configured ? 'test-rag' : '', RAG_INTERNAL_API_SECRET: configured ? 'never-print-this' : '', SCHEMATICS_EMBEDDING_VERSION: configured ? 'test-model' : ''};
      const result = await promisify(execFile)('sh', ['scripts/start-with-technical-worker.sh'], {env,timeout:5000});
      const calls = await readFile(log, 'utf8');
      assert.equal(calls.includes('scripts/index-schematics-vectors.mjs --watch'), configured);
      assert.equal(calls.includes('scripts/technical-worker.cjs --watch'), true);
      assert.equal(calls.includes('server.js'), true);
      const registration = calls.indexOf('scripts/register-schematic-additions.mjs');
      assert.ok(registration > calls.indexOf('migrate deploy'));
      assert.ok(registration < calls.indexOf('scripts/technical-worker.cjs'));
      assert.ok(registration < calls.indexOf('server.js'));
      assert.equal((result.stdout + result.stderr).includes('never-print-this'), false);
    }
    await writeFile(log, '');
    const importFailure = await promisify(execFile)('sh', ['scripts/start-with-technical-worker.sh'], {
      env: {...process.env, PATH: `${directory}:${process.env.PATH}`, STARTUP_TEST_LOG: log, STARTUP_TEST_FAIL_IMPORT: '1'}, timeout: 5000,
    });
    const failedCalls = await readFile(log, 'utf8');
    assert.equal(failedCalls.includes('scripts/register-schematic-additions.mjs'), true);
    assert.equal(failedCalls.includes('--watch'), true);
    assert.equal(failedCalls.includes('server.js'), true);
    assert.match(importFailure.stderr, /\[SCHEMATICS IMPORT\].*falló.*CRM continúa/);
    await writeFile(log, '');
    await assert.rejects(promisify(execFile)('sh', ['scripts/start-with-technical-worker.sh'], {
      env: {...process.env, PATH: `${directory}:${process.env.PATH}`, STARTUP_TEST_LOG: log, STARTUP_TEST_FAIL_MIGRATION: '1'}, timeout: 5000,
    }), error => error instanceof Error && 'code' in error && error.code === 1);
    const migrationCalls = await readFile(log, 'utf8');
    assert.equal(migrationCalls.includes('scripts/register-schematic-additions.mjs'), false);
    assert.equal(migrationCalls.includes('--watch'), false);
    assert.equal(migrationCalls.includes('server.js'), false);
  } finally { await rm(directory, {recursive:true,force:true}); }
});

test('connection loss during embedding aborts the cycle before storing a returned vector', async () => {
  const { EventEmitter } = await import('node:events');
  const { withIndexConnection } = await import('../../../scripts/technical-worker-queue');
  const client = Object.assign(new EventEmitter(), { release: () => {} });
  const stop = new AbortController();
  const saved: VectorChunk[] = [];
  const store: VectorStore = { existing: async () => new Set(), refresh: async () => {}, insert: async chunk => { saved.push(chunk); } };
  await assert.rejects(withIndexConnection(client, stop.signal, async signal => {
    await indexVectorPage(page, 'v1', store, async () => {
      client.emit('error', new Error('connection interrupted'));
      return [1];
    }, signal);
  }), /INDEX_CONNECTION_LOST/);
  assert.deepEqual(saved, []);
  assert.equal(stop.signal.aborted, false);
});
