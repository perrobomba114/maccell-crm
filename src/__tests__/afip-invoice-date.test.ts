import assert from "node:assert/strict";
import test from "node:test";

import { formatArgentinaDate } from "../lib/date-utils";

test("formats the fiscal voucher date in Argentina near the UTC day boundary", () => {
    const instant = new Date("2026-07-18T01:30:00.000Z");

    assert.equal(formatArgentinaDate(instant), "2026-07-17");
    assert.equal(formatArgentinaDate(instant, "yyyyMMdd"), "20260717");
});
