import { test } from "node:test";
import assert from "node:assert/strict";
import { isGroundNet, netColor } from "../../lib/schematics/net-style";
test("explicit ground names use a distinct color without classifying unknown or sense nets", () => {
  for (const name of ["GND", "AGND", "GND_AUDIO", "VSS"]) assert.equal(isGroundNet(name), true);
  for (const name of ["Net 1647", "PP_VDD_MAIN", "GND_SENSE_INVALID_PREFIX".replace("GND_", ""), "SIGNAL", "GNDREF"]) assert.equal(isGroundNet(name), false);
  assert.notEqual(netColor("GND"), netColor("PP_VDD_MAIN"));
});
