import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReferenceLookup} from '../../lib/schematics/reference-cache';
test('preloaded references preserve exact tokens, multiple pages and real coordinates',()=>{
 const box={text:'U4000',x:.1,y:.2,width:.05,height:.02};
 const lookup=buildReferenceLookup([{page:1,text:'U4000 U40001 PP_VDD_MAIN',boxes:[box]}, {page:3,text:'U4000',boxes:[]}]);
 assert.equal(lookup.get('u4000')?.length,2);
 assert.deepEqual(lookup.get('u4000')?.[0].boxes,[box]);
 assert.equal(lookup.get('U400')?.length??0,0);
 assert.equal(lookup.get('pp_vdd_main')?.[0].page,1);
});
