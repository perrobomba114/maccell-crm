import assert from "node:assert/strict";
import test from "node:test";
import { growthLabel } from "../lib/monthly-growth";

test("distingue ausencia de base, estabilidad y variaciones con signo", () => {
    assert.equal(growthLabel(null), "Sin base de comparación");
    for (const [value, expected] of [[0, "0%"], [-100, "-100%"], [2.75, "+2,8%"]] as const) {
        assert.equal(growthLabel(value).replace(/\s/g, ""), expected);
    }
});
