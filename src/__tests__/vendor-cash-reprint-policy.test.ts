import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionPath = new URL("../actions/cash-shifts/vendor-reprint.ts", import.meta.url);

test("vendor cash reprint authenticates and scopes the latest closed shift", () => {
    const source = readFileSync(actionPath, "utf8");

    assert.match(source, /getCurrentUser\(\)/);
    assert.match(source, /user\.role !== "VENDOR"/);
    assert.match(source, /userId: user\.id/);
    assert.match(source, /status: "CLOSED"/);
    assert.match(source, /getDailyRange\(date\)/);
    assert.match(source, /orderBy:\s*\[[\s\S]*\{ endTime: "desc" \},\s*\{ id: "desc" \}\s*\]/);
});

test("vendor cash reprint bounds sales and expenses to the selected shift", () => {
    const source = readFileSync(actionPath, "utf8");

    assert.match(source, /createdAt:\s*\{ gte: shift\.startTime, lte: shift\.endTime \}/);
    assert.match(source, /vendorId: user\.id/);
    assert.match(source, /branchId: shift\.branchId/);
    assert.match(source, /Promise\.all/);
    assert.match(source, /buildCashShiftReprintSummary/);
    assert.match(source, /closedAt: shift\.endTime/);
});

test("cash closure tickets preserve the original closing time when reprinted", () => {
    const ticket = readFileSync(new URL("../lib/printing/cash-tickets.ts", import.meta.url), "utf8");

    assert.match(ticket, /closedAt\?: Date/);
    assert.match(ticket, /closedAt \?\? new Date\(\)/);
});
