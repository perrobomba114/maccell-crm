import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('a registered PDF resumes missing board associations on rerun without replacing existing links', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'schematic-additions-'));
  const stateFile = path.join(directory, 'state.json');
  try {
    await mkdir(path.join(directory, 'node_modules/pg'), { recursive: true });
    await copyFile('scripts/register-schematic-additions.mjs', path.join(directory, 'register.mjs'));
    // A persistent fake database runs the actual CLI across separate startup attempts.
    await writeFile(path.join(directory, 'node_modules/pg/index.js'), `
const fs = require('node:fs');
class Pool {
  constructor() { this.state = JSON.parse(fs.readFileSync(process.env.IMPORT_TEST_STATE, 'utf8')); }
  async connect() { return {release() {}, query: async (sql, values = []) => {
    if (sql === 'BEGIN' || sql === 'ROLLBACK') return {rows: []};
    if (sql === 'COMMIT') { fs.writeFileSync(process.env.IMPORT_TEST_STATE, JSON.stringify(this.state)); return {rows: []}; }
    if (sql.startsWith('SELECT metadata')) return {rows: this.state.assets[values[0]] ? [{metadata: this.state.assets[values[0]]}] : []};
    if (sql.startsWith('INSERT INTO schematics.assets')) {
      this.state.assets[values[0]] = this.state.assets[values[0]]
        ? {...this.state.assets[values[0]], sourceImportId: values[6]}
        : JSON.parse(values[5]);
      return {rows: []};
    }
    if (sql.startsWith('UPDATE schematics.assets')) {
      Object.assign(this.state.assets[values[0]], JSON.parse(values[1])); return {rows: []};
    }
    if (sql.startsWith('INSERT INTO schematics.index_jobs')) {
      this.state.jobs[values[0]] ??= {sha256: values[1], status: 'pending'}; return {rows: []};
    }
    throw new Error('Unexpected import query');
  }}; }
  async end() {}
}
module.exports = {Pool};
`);
    const pdfBytes = Buffer.from('verified PDF fixture');
    const boardBytes = Buffer.from('verified board fixture');
    const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
    await writeFile(path.join(directory, 'reference.pdf'), pdfBytes);
    await writeFile(path.join(directory, 'board.pcbe'), boardBytes);
    const asset = { id: 'pdf', relativePath: 'reference.pdf', sha256: sha(pdfBytes), size: pdfBytes.length, kind: 'pdf', modelKey: 'phone' };
    const board = { id: 'board', sha256: sha(boardBytes) };
    await writeFile(path.join(directory, 'schematic-additions.json'), JSON.stringify({
      importId: 'review-1', asset, pairedBoards: [board], evidence: { reviewedAt: '2026-09-05T00:00:00Z' },
    }));
    await writeFile(stateFile, JSON.stringify({ assets: {}, jobs: {} }));
    const run = () => promisify(execFile)(process.execPath, [path.join(directory, 'register.mjs')], {
      env: { ...process.env, SCHEMATICS_ROOT: directory, IMPORT_TEST_STATE: stateFile, DATABASE_URL: 'test-only', NODE_ENV: 'production' },
    });
    await run();
    const first = JSON.parse(await readFile(stateFile, 'utf8'));
    assert.equal(first.assets.pdf.sourceImportId, 'review-1');
    assert.equal(first.assets.board, undefined);
    const existingLink = { assetId: 'other-pdf', sha256: 'other', sourceSha256: board.sha256, confirmedBy: 'admin', confirmedAt: '2026-09-04' };
    // The catalog worker imports the board after the initial PDF registration.
    first.assets.board = { ...board, relativePath: 'board.pcbe', documentLinks: [existingLink] };
    first.jobs.pdf.status = 'indexed';
    await writeFile(stateFile, JSON.stringify(first));
    await run();
    const resumed = JSON.parse(await readFile(stateFile, 'utf8'));
    assert.equal(resumed.assets.board.documentLinks.length, 2);
    assert.deepEqual(resumed.assets.board.documentLinks[0], existingLink);
    assert.equal(resumed.assets.board.documentLinks[1].assetId, asset.id);
    assert.equal(resumed.assets.board.documentLinks[1].sourceSha256, board.sha256);
    assert.equal(resumed.assets.board.documentLinks[1].sha256, asset.sha256);
    assert.equal(resumed.jobs.pdf.status, 'indexed');
    await run();
    assert.deepEqual(JSON.parse(await readFile(stateFile, 'utf8')), resumed);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
