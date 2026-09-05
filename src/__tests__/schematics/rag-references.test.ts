import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, utimes, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { currentReferenceFile, mergeReferenceMatches, readRagReferenceMatches } from '../../lib/schematics/rag-reference-pages';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';
import type { RagQuery } from '../../lib/schematics/rag-library';

const asset: SchematicAsset = {id:'pdf',kind:'pdf',name:'phone.pdf',relativePath:'sources/phone.pdf',sha256:'a'.repeat(64),size:4,status:'ready',model:'phone',modelKey:'phone'};

test('RAG references use current document identity and exact bounded excerpts without fabricating coordinates', async () => {
  const query: RagQuery = async <T extends Record<string, unknown>>(sql: string, params: readonly unknown[]) => {
    assert.match(sql, /d\.relative_path=a\.relative_path AND d\.sha256=a\.asset_sha256/);
    assert.match(sql, /d\.status='READY'/);
    assert.match(sql, /p\.status='READY'/);
    assert.match(sql, /LIMIT 50/);
    assert.deepEqual(JSON.parse(String(params[0])), [{asset_id:'pdf',asset_sha256:asset.sha256,relative_path:'phone.pdf'}]);
    const pattern = new RegExp(String(params[1]), 'is');
    assert.equal(pattern.test('U40001'), false);
    assert.equal(pattern.test('PP_U4000_RAIL'), false);
    const excerpt = pattern.exec('Charging circuit U4000 pin 1')?.[1];
    return [
      {asset_sha256:asset.sha256,page_number:2,excerpt,source:'text'},
      {asset_sha256:'b'.repeat(64),page_number:3,excerpt:'U4000 stale',source:'ocr'},
    ] as unknown as T[];
  };
  const result = await readRagReferenceMatches(query,asset,'U4000');
  assert.deepEqual(result?.matches,[{page:2,excerpt:'Charging circuit U4000 pin 1'}]);
  assert.deepEqual(result?.sources,['text']);
  assert.equal('boxes' in result!.matches[0],false);
});

test('RAG reference lookup distinguishes no current document from a ready document without this token', async () => {
  const missing: RagQuery = async () => [];
  assert.equal(await readRagReferenceMatches(missing,asset,'U4000'),null);
  const empty: RagQuery = async <T extends Record<string, unknown>>() => [{asset_sha256:asset.sha256,page_number:null,excerpt:null,source:null}] as unknown as T[];
  assert.deepEqual(await readRagReferenceMatches(empty,asset,'U4000'),{matches:[],sources:[]});
});

test('partial technical coordinates take precedence when RAG supplies remaining pages', () => {
  const box={text:'U4000',x:.1,y:.2,width:.03,height:.02};
  assert.deepEqual(mergeReferenceMatches([{page:2,excerpt:'technical',boxes:[box]}],[{page:2,excerpt:'rag duplicate'},{page:1,excerpt:'rag first'}]),[
    {page:1,excerpt:'rag first'},{page:2,excerpt:'technical',boxes:[box]},
  ]);
});

test('RAG fallback checks physical SHA even when size and timestamps appear unchanged', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'rag-reference-file-'));
  try {
    const file=path.join(root,'phone.pdf');
    await writeFile(file,'old!');
    const before=await stat(file);
    const original={...asset,relativePath:'phone.pdf',sha256:createHash('sha256').update('old!').digest('hex')};
    assert.equal(await currentReferenceFile(original,root),true);
    await writeFile(file,'new!');
    await utimes(file,before.atime,before.mtime);
    assert.equal(await currentReferenceFile(original,root),false);
    await assert.rejects(currentReferenceFile({...original,relativePath:'../outside.pdf'},root));
  }finally{await rm(root,{recursive:true,force:true});}
});
