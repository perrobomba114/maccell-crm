import test from 'node:test';
import assert from 'node:assert/strict';

test('startup runs the technical worker without duplicating the existing RAG pipeline', async () => {
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
      assert.equal(calls.includes('scripts/index-schematics-vectors.mjs'), false);
      assert.equal(calls.includes('schematics-vector-worker'), false);
      assert.equal((result.stdout + result.stderr).includes('SCHEMATICS_EMBEDDING_VERSION'), false);
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

test('worker build emits only the technical extractor bundle', async () => {
  const { mkdtemp, mkdir, writeFile, readdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const directory = await mkdtemp(path.join(tmpdir(), 'technical-build-'));
  const buildScript = path.resolve('scripts/build-technical-worker.mjs');
  try {
    await mkdir(path.join(directory,'scripts'));
    await writeFile(path.join(directory,'scripts/index-technical-library.ts'), "process.stdout.write('technical extractor');");
    await writeFile(path.join(directory,'scripts/schematics-vector-worker.ts'), "throw new Error('duplicate vector pipeline');");
    await promisify(execFile)(process.execPath,[buildScript],{cwd:directory,timeout:10000});
    const bundles = (await readdir(path.join(directory,'scripts'))).filter(file=>file.endsWith('.cjs'));
    assert.deepEqual(bundles,['technical-worker.cjs']);
    const output = await promisify(execFile)(process.execPath,[path.join(directory,'scripts/technical-worker.cjs')],{timeout:5000});
    assert.equal(output.stdout,'technical extractor');
  } finally { await rm(directory,{recursive:true,force:true}); }
});
