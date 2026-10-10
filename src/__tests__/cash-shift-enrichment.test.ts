import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import type { CashShift } from "@prisma/client";
import type { CashShiftWithDetails } from "../actions/cash-shifts/enrich-utils";

test("admin cash totals preserve closed prizes including zero and project open prizes", async () => {
    const start = new Date("2026-10-10T10:00:00Z");
    const end = new Date("2026-10-10T20:00:00Z");
    const base = {
        id: "shift", userId: "vendor", branchId: "branch", startTime: start,
        endTime: end, startAmount: 0, endAmount: 1_010_000,
        createdAt: start, updatedAt: end, employeeCount: 2,
        branch: { name: "Branch" }, user: { name: "Vendor" },
    };
    const shifts: Array<CashShift & { branch: { name: string }; user: { name: string } }> = [
        { ...base, status: "CLOSED", bonusTotal: 0 },
        { ...base, status: "CLOSED", bonusTotal: 30_000 },
        { ...base, status: "OPEN", bonusTotal: 0 },
    ];
    const db = {
        sale: { findMany: async () => [{
            total: 1_010_000, paymentMethod: "CASH", payments: [],
            branchId: "branch", vendorId: "vendor", createdAt: new Date("2026-10-10T12:00:00Z"),
        }] },
        expense: { findMany: async () => [] },
    };
    const bundled = await build({
        entryPoints: [new URL("../actions/cash-shifts/enrich-utils.ts", import.meta.url).pathname],
        bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
        plugins: [{ name: "enrichment-db", setup(builder) {
            builder.onResolve({ filter: /^@\/lib\/db$/ }, () => ({ path: "db", namespace: "test-db" }));
            builder.onLoad({ filter: /.*/, namespace: "test-db" }, () => ({ contents: "export const db = __db;", loader: "js" }));
        } }],
    });
    const testModule = { exports: {} as { enrichShiftsOptimized: (input: typeof shifts, start: Date, end: Date) => Promise<CashShiftWithDetails[]> } };
    new Function("require", "module", "exports", "__db", bundled.outputFiles[0].text)(createRequire(import.meta.url), testModule, testModule.exports, db);
    const result = await testModule.exports.enrichShiftsOptimized(shifts, start, end);
    assert.deepEqual(result.map(shift => shift.totals.bonuses), [0, 30_000, 22_000]);
    assert.deepEqual(result.map(shift => shift.totals.netTotal), [1_010_000, 980_000, 988_000]);
});
