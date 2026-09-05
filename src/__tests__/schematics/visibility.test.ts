import { test } from "node:test";
import assert from "node:assert/strict";
import { initialLayer, visiblePrimitive, workshopGeometry } from "../../lib/schematics/visibility";
import type { GeometryPrimitive } from "../../lib/schematics/types";
const pin: GeometryPrimitive = {kind:"pin",layer:2,x:0,y:0,radius:1,netIndex:0,name:"1"};
const track: GeometryPrimitive = {kind:"segment",layer:2,x1:0,y1:0,x2:1,y2:1,width:1,netIndex:0};
test("workshop retains the real contour belonging to visible pads even on a separate drawing layer", () => {
  const pad: GeometryPrimitive = {...pin, componentId:"U1"};
  const outline: GeometryPrimitive = {kind:"outline",layer:28,x1:0,y1:0,x2:2,y2:2,width:1,componentId:"U1"};
  const hiddenOutline: GeometryPrimitive = {...outline,componentId:"U2"};
  assert.deepEqual(workshopGeometry([pad,outline,hiddenOutline,track],new Set([2]),"clean",false),[pad,outline]);
});
test("initial view selects a component layer instead of accumulating copper layers",()=>{
  assert.equal(initialLayer([{...track,layer:1},pin]),2);
});
test("clean view hides copper and hidden-layer pads",()=>{
  assert.equal(visiblePrimitive(track,new Set([2]),"clean",false),false);
  assert.equal(visiblePrimitive(pin,new Set([2]),"clean",false),true);
  assert.equal(visiblePrimitive(pin,new Set([1]),"all",true),false);
  assert.equal(visiblePrimitive(track,new Set([2]),"tracks",false),true);
});
test("vias require explicit visibility and a visible endpoint layer",()=>{
  const via: GeometryPrimitive={kind:"via",layer:9,layerA:2,layerB:3,x:0,y:0,outerRadius:1,innerRadius:.5,netIndex:0,text:""};
  assert.equal(visiblePrimitive(via,new Set([2]),"all",false),false);
  assert.equal(visiblePrimitive(via,new Set([2]),"all",true),true);
  assert.equal(visiblePrimitive(via,new Set([4]),"all",true),false);
});
