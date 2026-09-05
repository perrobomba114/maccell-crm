import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBboxXml, parseOcrTsv, indexIsCurrent, indexReferenceMatches, indexFileIsCurrent, imagePagesForOcr, mergeOcrPage, indexBoard } from '../../lib/schematics/unified-index';

test('PDF boxes preserve page coordinates normalized and exact designators', () => {
 const pages = parseBboxXml('<doc><page width="100" height="200"><word xMin="10" yMin="20" xMax="30" yMax="40">U4000</word><word xMin="40" yMin="20" xMax="70" yMax="40">U40001</word></page></doc>');
 assert.deepEqual(pages[0].boxes[0], {text:'U4000',x:0.1,y:0.1,width:0.2,height:0.1});
 assert.equal(indexReferenceMatches(pages,'U4000')[0].boxes.length,1);
 assert.equal(indexReferenceMatches(pages,'U400')[0], undefined);
});
test('OCR extracts only confident word boxes and never fabricates positions', () => {
 const tsv='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n1\t1\t0\t0\t0\t0\t0\t0\t1000\t500\t-1\t\n5\t1\t1\t1\t1\t1\t100\t50\t50\t20\t92\tC123\n5\t1\t1\t1\t1\t2\t200\t50\t50\t20\t15\tR999';
 const page=parseOcrTsv(tsv,3);
 assert.equal(page.page,3); assert.equal(page.source,'ocr'); assert.equal(page.boxes.length,1);
 assert.deepEqual(page.boxes[0],{text:'C123',x:0.1,y:0.1,width:0.05,height:0.04});
 assert.equal(page.text,'C123');
});
test('indexes require current extractor version, identity and file hash', () => {
 const index={version:1,assetId:'a',sha256:'b',pages:[],components:[],nets:[]};
 assert.equal(indexIsCurrent(index,{id:'a',sha256:'b'}),true);
 assert.equal(indexIsCurrent(index,{id:'a',sha256:'c'}),false);
 assert.equal(indexIsCurrent({...index,version:0},{id:'a',sha256:'b'}),false);
});
test('invalid coordinates are excluded; text remains searchable without fake box', () => {
 const pages=parseBboxXml('<doc><page width="100" height="100"><word xMin="NaN" yMin="0" xMax="10" yMax="20">R1</word></page></doc>');
 assert.equal(pages[0].boxes.length,0); assert.equal(pages[0].text,'R1');
});

test('punctuation keeps exact-reference boxes and multiple measured occurrences', () => {
 const pages=parseBboxXml('<doc><page width="100" height="100"><word xMin="1" yMin="2" xMax="8" yMax="9">(U1)</word><word xMin="11" yMin="2" xMax="18" yMax="9">U1,</word><word xMin="21" yMin="2" xMax="28" yMax="9">U10</word></page></doc>');
 assert.equal(indexReferenceMatches(pages,'U1')[0].boxes.length,2);
});

test('fingerprints reject same-size replacements and legacy caches', () => {
 assert.equal(indexFileIsCurrent({}, {size:100,mtimeMs:2}),false);
 assert.equal(indexFileIsCurrent({fileSize:100,fileMtimeMs:1}, {size:100,mtimeMs:2}),false);
 assert.equal(indexFileIsCurrent({fileSize:100,fileMtimeMs:2}, {size:100,mtimeMs:2}),true);
});
test('hybrid image pages trigger OCR and merging preserves native references', () => {
 assert.deepEqual(imagePagesForOcr('page num type width height\n1 0 image 1600 2000 rgb\n2 1 image 20 20 rgb\n3 2 smask 400 400 gray'),[1]);
 const native=parseBboxXml('<doc><page width="100" height="100"><word xMin="10" yMin="20" xMax="20" yMax="30">U1</word></page></doc>')[0];
 const ocr={page:1,text:'U1 C2',source:'ocr' as const,boxes:[native.boxes[0],{...native.boxes[0],text:'C2',x:.5}]};
 const merged=mergeOcrPage(native,ocr);
 assert.equal(merged.source,'ocr'); assert.equal(merged.boxes.length,2);
 assert.deepEqual(mergeOcrPage(merged,ocr),merged);
 assert.equal(merged.boxes[0],native.boxes[0]); assert.equal(indexReferenceMatches([merged],'C2')[0].boxes[0].x,.5);
 assert.equal(mergeOcrPage(native,{...ocr,text:'',boxes:[]}),native);
});
test('board index removes NUL bytes from parsed PostgreSQL text fields', () => {
 const board={validHeader:true,geometry:[{}],components:[{id:'u1',name:'U1\0',kind:'IC\0',pads:[{id:'p1',name:'1\0',layer:1,x:1,y:2,netIndex:0}]}],netCatalog:[{id:0,name:'GND\0'}]} as unknown as Parameters<typeof indexBoard>[0];
 const index=indexBoard(board,{id:'a',sha256:'b'});
 assert.equal(index.components[0].name,'U1'); assert.equal(index.components[0].kind,'IC');
 assert.equal(index.components[0].pads[0].name,'1'); assert.equal(index.nets[0].name,'GND');
});
