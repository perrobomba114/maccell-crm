import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceNamespaceMismatch} from '../../lib/schematics/reference-namespace';
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
