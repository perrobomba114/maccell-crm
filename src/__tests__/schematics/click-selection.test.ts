import assert from 'node:assert/strict';
import test from 'node:test';
import { clickSelections } from '../../lib/schematics/click-selection';
import type { SelectionCandidate } from '../../lib/schematics/boardview';
const pad: SelectionCandidate = {kind:'pad',primitiveIndex:0,distance:0,componentId:'C10',padId:'1',netId:2,label:'1'};
test('one component with several pads selects directly without a chooser',()=>{
 assert.equal(clickSelections([pad,{...pad,padId:'2',netId:3},{...pad,kind:'component',netId:null}]).length,1);
});
test('a component wins over a nearby track and the closest actual component wins',()=>{
 const other={...pad,componentId:'C11',distance:3};
 const trace:SelectionCandidate={kind:'trace',primitiveIndex:4,distance:0,netId:5,label:'Pista'};
 assert.deepEqual(clickSelections([trace,other,pad]).map(x=>x.componentId),['C10','C11',undefined]);
 assert.equal(clickSelections([trace])[0],trace);
});
