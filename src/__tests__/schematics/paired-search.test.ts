import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateCatalog } from '../../lib/schematics/search';
import { declaredModel, documentRole, preferredCounterpart, confirmedPair, contentPairEvidence } from '../../lib/schematics/pairing';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';
const board: SchematicAsset = {id:'board',sha256:'board-sha',name:'iPhone13ProMax AP Boardview 820-02400-06.pcbe',model:'iPhone13ProMAX',modelKey:'iphone13promax',brand:'Apple',kind:'pcbe',relativePath:'pcbe/file',size:1,status:'ready'};
const pdf: SchematicAsset = {...board,id:'pdf',sha256:'pdf-sha',kind:'pdf',name:'iPhone 13 Pro Max schematic.pdf'};
test('catalog puts exact model and primary schematics ahead of cases and accessory boards',()=>{
 const files=[{...board,id:'flex',name:'iPhone13ProMax FaceID Flexible flat cable.pcbe'},{...pdf,id:'case',name:'iPhone13ProMax repair case.pdf'},pdf,board];
 assert.deepEqual(paginateCatalog(files,{q:'13pm',kind:'all',page:1,pageSize:40}).assets.map(a=>a.id),['pdf','board','flex','case']);
});
test('filename model declarations distinguish iPhone variants and do not use folder labels',()=>{
 assert.equal(declaredModel('iPhone 13 Pro Max schematic.pdf'),'iphone13promax');
 assert.equal(declaredModel('iPhone13Pro schematics.pdf'),'iphone13pro');
 assert.equal(declaredModel('service.pdf'),null);
 assert.equal(documentRole({...pdf,name:'charging repair case.pdf'}),'repair');
});
test('full model searches and aliases exclude incidental digits in other models',()=>{
 const unrelated={...pdf,id:'other',model:'iPhone15ProMax',modelKey:'iphone15promax',name:'U4000 13-14-15.pdf'};
 for(const q of ['13pm','13 pro max','iphone 13 pro max','iPhone13ProMax']) {
  assert.deepEqual(paginateCatalog([unrelated,pdf,board],{q,kind:'all',page:1,pageSize:40}).assets.map(a=>a.id),['pdf','board']);
 }
});
test('content pairing requires model declaration and exact board revision',()=>{
 assert.ok(contentPairEvidence(board,pdf,'iPhone 13 Pro Max SCHEMATIC 820-02400-06'));
 assert.equal(contentPairEvidence(board,pdf,'iPhone 13 Pro Max SCHEMATIC 820-02400-07'),null);
 assert.equal(contentPairEvidence(board,pdf,'iPhone 13 Pro SCHEMATIC 820-02400-06'),null);
 assert.equal(contentPairEvidence(board,pdf,'U4000 C100 PP_VDD_MAIN'),null);
 assert.equal(contentPairEvidence(board,pdf,'iPhone 13 Pro Max 820-02400-07 Comparison iPhone 13 Pro 820-02400-06'),null);
 assert.equal(contentPairEvidence(board,pdf,'iPhone 13 Pro Max 820-02400-06 820-02400-07'),null);
});
test('preferred counterpart selects a unique primary schematic and keeps ambiguities explicit',()=>{
 const casePdf={...pdf,id:'case',name:'iPhone 13 Pro Max repair case.pdf'};
 assert.equal(preferredCounterpart([casePdf,pdf])?.id,pdf.id);
 assert.equal(preferredCounterpart([pdf,{...pdf,id:'other'}]),null);
 const whole={...board,id:'whole',name:'iPhone13ProMax Boardview.pcbe'};
 assert.equal(preferredCounterpart([board,whole])?.id,'whole');
 assert.equal(preferredCounterpart([board,{...board,id:'bb',name:'iPhone13ProMax BB Boardview.pcbe'}]),null);
});
test('confirmed pairs are bound to both current file hashes',()=>{
 const linked={...board,documentLinks:[{assetId:pdf.id,sha256:pdf.sha256,sourceSha256:board.sha256,confirmedBy:'admin',confirmedAt:'2026-09-05'}]};
 assert.equal(confirmedPair(linked,pdf),true);
 assert.equal(confirmedPair(linked,{...pdf,sha256:'changed'}),false);
 assert.equal(confirmedPair({...linked,sha256:'changed'},pdf),false);
 assert.equal(confirmedPair(linked,{...pdf,model:'iPhone 13 Pro',modelKey:'iphone13pro'}),false);
});
