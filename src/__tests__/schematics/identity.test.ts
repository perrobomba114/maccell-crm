import assert from "node:assert/strict";
import test from "node:test";
import { parseVerifiedIdentity } from "../../lib/schematics/identity";

const valid = { verified: true, brand: "Apple", model: "iPhone 15 Pro Max", boardCode: "D84", revision: "820-00001-A", aliases: ["A3108"] };

test("verified identity requires explicit complete string evidence", () => {
  assert.deepEqual(parseVerifiedIdentity(valid), { brand: valid.brand, model: valid.model, boardCode: valid.boardCode, revision: valid.revision, aliases: valid.aliases });
  for (const changed of [
    { ...valid, verified: false }, { ...valid, brand: 15 }, { ...valid, model: "" },
    { ...valid, boardCode: true }, { ...valid, revision: null }, { ...valid, aliases: "A3108" },
    { ...valid, aliases: [42] }, { ...valid, aliases: Array.from({ length: 21 }, (_, index) => `A${index}`) },
  ]) assert.throws(() => parseVerifiedIdentity(changed));
});
