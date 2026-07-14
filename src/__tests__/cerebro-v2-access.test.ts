import assert from "node:assert/strict";
import test from "node:test";

import { canUseCerebroV2 } from "../lib/cerebro-v2/access";

test("allows administrators to use Cerebro V2", () => {
    assert.equal(canUseCerebroV2("ADMIN"), true);
});

test("allows technicians to use Cerebro V2", () => {
    assert.equal(canUseCerebroV2("TECHNICIAN"), true);
});

test("rejects vendors and missing roles", () => {
    assert.equal(canUseCerebroV2("VENDOR"), false);
    assert.equal(canUseCerebroV2(undefined), false);
});
