import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionsFor } from "../../lib/schematics/connections";
import type { PcbeComponent } from "../../lib/schematics/types";

const part = (id: string, nets: (number | null)[]): PcbeComponent => ({ id, name: id, kind: "test", outlineCount: 0, pads: nets.map((netIndex, i) => ({ id: `${id}-${i}`, name: `${i}`, componentId: id, netIndex, layer: 1, x: i, y: 0, radius: 1 })) });
const parts = [part("U1", [0, 7, null]), part("C1", [0, 99]), part("R1", [7]), part("U2", [99]), part("NC", [null])];
test("component selection includes directly connected parts, never transitive or unassigned pads", () => {
  const result = connectionsFor(parts, "U1", null);
  assert.deepEqual([...result.nets], [0, 7]);
  assert.deepEqual(result.components.map(p => p.id), ["C1", "R1"]);
});
test("an explicit net including zero isolates that net", () => {
  const result = connectionsFor(parts, "U1", 0);
  assert.deepEqual([...result.nets], [0]);
  assert.deepEqual(result.components.map(p => p.id), ["C1"]);
});
test("clearing selection clears all connections", () => {
  assert.equal(connectionsFor(parts, null, null).components.length, 0);
  assert.equal(connectionsFor(parts, "NC", null).nets.size, 0);
});
