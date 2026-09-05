import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import { persistTechnicalIndex } from '../../../scripts/technical-index-database';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';
import type { TechnicalIndex } from '../../lib/schematics/unified-index';
const asset: SchematicAsset={id:'a',name:'a.pdf',kind:'pdf',model:'x',modelKey:'x',relativePath:'a.pdf',size:1,sha256:'b',status:'ready'};
const index: TechnicalIndex={version:1,assetId:'a',sha256:'b',pages:[{page:1,text:'U1',source:'text',boxes:[]}],components:[],nets:[]};
function clientFor(writes: number) {
 const calls: {sql:string;values?:unknown[]}[]=[];
 // Structural stand-in: only PoolClient.query is exercised by this transaction helper.
 const client={query:async(sql:string,values?:unknown[])=>{calls.push({sql,values});return {rowCount:sql.includes('schematics.technical_indexes')?writes:1,rows:[]};}} as unknown as pg.PoolClient;
 return {client,calls};
}
test('concurrent OCR index prevents worker from deleting its page evidence', async()=>{
 for (const expected of [null,'2026-09-05 12:34:56.123456+00']) {
  const {client,calls}=clientFor(0);
  await assert.rejects(persistTechnicalIndex(client,asset,index,expected),/INDEX_WRITE_CONFLICT/);
  assert.equal(calls.at(-1)?.sql,'ROLLBACK');
  assert.equal(calls.some(call=>call.sql.startsWith('DELETE')),false);
 }
});
test('successful index transaction preserves microsecond optimistic revision', async()=>{
 const {client,calls}=clientFor(1);
 const expected='2026-09-05 12:34:56.123456+00';
 await persistTechnicalIndex(client,asset,index,expected);
 assert.equal(calls[1].values?.[3],expected);
 assert.match(calls[1].sql,/updated_at=\$4::timestamptz/);
 assert.equal(calls.at(-1)?.sql,'COMMIT');
 assert.equal(calls.some(call=>call.sql.startsWith('DELETE FROM schematics.pages')),true);
});
