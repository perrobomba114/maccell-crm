import { test } from "node:test";
import assert from "node:assert/strict";
import { physicalTracks } from "../../lib/schematics/physical-tracks";
import type { GeometryPrimitive } from "../../lib/schematics/types";
test("highlight preserves actual track coordinates and never bridges unconnected pads", () => {
  const track: GeometryPrimitive = {kind:"segment",layer:3,x1:12,y1:15,x2:17,y2:23,width:2,netIndex:0};
  const pad: GeometryPrimitive = {kind:"pin",layer:29,x:100,y:100,radius:1,name:"1",netIndex:0};
  assert.deepEqual(physicalTracks([pad,track,{...track,netIndex:1}],new Set([0])),[track]);
  assert.deepEqual(physicalTracks([pad],new Set([0])),[]);
  assert.deepEqual(physicalTracks([track],new Set()),[]);
});
