import test from 'node:test';
import assert from 'node:assert/strict';
import {CatalogCache} from '../../lib/schematics/catalog-cache';
test('catalog requests share one read, while a changed inventory and identity edits invalidate immediately',async()=>{
 let time=0,reads=0;
 const cache=new CatalogCache(()=>time,5);
 const load=async()=>{reads++;return {version:1 as const,importedAt:'',assets:[]};};
 await Promise.all([cache.read('snapshot-1',load),cache.read('snapshot-1',load)]);assert.equal(reads,1);
 await cache.read('snapshot-2',load);assert.equal(reads,2);
 cache.invalidate();await cache.read('snapshot-2',load);assert.equal(reads,3);
 time=6;await cache.read('snapshot-2',load);assert.equal(reads,4);
});
test('a failed catalog lookup does not poison later requests',async()=>{
 const cache=new CatalogCache();await assert.rejects(cache.read('key',async()=>{throw Error('database unavailable');}));
 assert.equal((await cache.read('key',async()=>({version:1,importedAt:'',assets:[]}))).version,1);
});
