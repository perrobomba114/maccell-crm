import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceNamespaceMismatch,officialLayoutPages} from '../../lib/schematics/reference-namespace';
const board=Array.from({length:50},(_,i)=>`C${100+i}`);
const nets=Array.from({length:50},(_,i)=>`Net${i}`);
const pdf=Array.from({length:50},(_,i)=>`C${1000+i}`).join(' ');
test('local board numbering must not navigate to incidental BGA pin names',()=>{
 assert.equal(referenceNamespaceMismatch([...board,'L41','R27'],nets,pdf+' L41 R27'),true);
});
test('matching references, real net labels and insufficient evidence are not a proven namespace mismatch',()=>{
 assert.equal(referenceNamespaceMismatch(board,nets,pdf+' C120'),false);
 assert.equal(referenceNamespaceMismatch(board,['VBAT','VDD_MAIN'],pdf),false);
 assert.equal(referenceNamespaceMismatch(['C100'],nets,pdf),false);
});

test('official layout navigation requires a declared layout or PCB drawing',()=>{
 assert.deepEqual(officialLayoutPages([{page:1,text:'Components Layout'},{page:2,text:pdf},{page:3,text:'Repair circuit '+pdf},{page:4,text:'Manufacture Count'}]),[2,4]);
 assert.deepEqual(officialLayoutPages([{page:1,text:pdf}]),[]);
});
