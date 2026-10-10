import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import type { ShiftSummary } from "../lib/actions/cash-register";

const require = createRequire(import.meta.url);
const bundled = build({
    entryPoints: [new URL("../lib/actions/cash-register.ts", import.meta.url).pathname],
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "cash-boundaries", setup(builder) {
        const stubs: Record<string, string> = {
            "@/lib/db": "export const db = __cashTestDeps.db;",
            "@/actions/auth-actions": "export const getCurrentUser = async () => __cashTestDeps.actor;",
            "next/cache": "export const revalidatePath = () => {};",
        };
        builder.onResolve({ filter: /.*/ }, args => args.path in stubs ? { path: args.path, namespace: "cash-test" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "cash-test" }, args => ({ contents: stubs[args.path], loader: "js" }));
    } }],
});

async function harness(options: { owner?: string; branch?: string; status?: string; updated?: number; salesTotal?: number; bonusTotal?: number } = {}) {
    const queries: Array<{ branchId: string; createdAt: { gte: Date; lte: Date } }> = [];
    const writes: Array<{ bonusTotal: number; endTime: Date; status: string }> = [];
    const shift = { userId: options.owner ?? "vendor", branchId: options.branch ?? "branch", status: options.status ?? "OPEN", startTime: new Date("2026-10-10T10:00:00Z"), startAmount: 5_000, bonusTotal: options.bonusTotal ?? 0, employeeCount: 1 };
    const db = {
        cashShift: {
            findUnique: async () => shift,
            updateMany: async ({ data }: { data: typeof writes[number] }) => { if ((options.updated ?? 1) > 0) writes.push(data); return { count: options.updated ?? 1 }; },
        },
        sale: { findMany: async ({ where }: { where: typeof queries[number] }) => {
            queries.push(where);
            if (options.salesTotal !== undefined) return [{ total: options.salesTotal, paymentMethod: "CASH", payments: [{ method: "CASH", amount: options.salesTotal }] }];
            return [{ total: 1_050_000, paymentMethod: "SPLIT", payments: [{ method: "CASH", amount: 549_999 }, { method: "CARD", amount: 500_000 }] }];
        } },
        expense: { findMany: async ({ where }: { where: typeof queries[number] }) => { queries.push(where); return [{ amount: 1_000 }]; } },
        $transaction: async (run: (tx: unknown) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "RepeatableRead"); return run(db); },
    };
    const testModule = { exports: {} as { closeRegister: (id: string, amount: number, count?: number) => Promise<{ success: boolean; summary?: ShiftSummary; closedAt?: Date }>; getShiftSummary: (id: string) => Promise<{ success: boolean; summary?: ShiftSummary }> } };
    new Function("require", "module", "exports", "__cashTestDeps", (await bundled).outputFiles[0].text)(require, testModule, testModule.exports, {
        db, actor: { id: "vendor", role: "VENDOR", branch: { id: "branch" } },
    });
    return { close: testModule.exports.closeRegister, summary: testModule.exports.getShiftSummary, writes, queries, shift };
}

test("closure persists and returns the same prize and bounded cash snapshot", async () => {
    const h = await harness();
    const result = await h.close("shift", 531_999, 2);
    assert.equal(result.success, true);
    assert.equal(result.summary?.calculatedBonus, 11_000);
    assert.equal(result.summary?.expectedCash, 553_999);
    assert.equal(h.writes[0].bonusTotal, 22_000);
    assert.equal(h.writes[0].endTime, result.closedAt);
    for (const query of h.queries) {
        assert.equal(query.branchId, "branch");
        assert.equal(query.createdAt.gte, h.shift.startTime);
        assert.equal(query.createdAt.lte, result.closedAt);
    }
});

test("closure above one million persists upward rounding without enabling the 2% prize early", async () => {
    const h = await harness({ salesTotal: 1_010_000 });
    const result = await h.close("shift", 992_000, 2);
    assert.equal(result.success, true);
    assert.equal(result.summary?.calculatedBonus, 11_000);
    assert.equal(h.writes[0].bonusTotal, 22_000);
    assert.equal(result.summary!.expectedCash - h.writes[0].bonusTotal, 992_000);
});

test("closure rejects another vendor, another branch and closed shifts before financial writes", async () => {
    for (const options of [{ owner: "other" }, { branch: "other" }, { status: "CLOSED" }, { updated: 0 }]) {
        const h = await harness(options);
        assert.equal((await h.close("shift", 0)).success, false);
        assert.deepEqual(h.writes, []);
    }
});

test("invalid money or fractional employee counts cannot close a shift", async () => {
    for (const [amount, count] of [[NaN, 1], [Infinity, 1], [-1, 1], [0, 0], [0, 1.5]]) {
        const h = await harness();
        assert.equal((await h.close("shift", amount, count)).success, false);
        assert.deepEqual(h.writes, []);
        assert.deepEqual(h.queries, []);
    }
});

test("closed summaries preserve recorded prizes, including zero, while open shifts project the current rule", async () => {
    for (const bonusTotal of [0, 15_000]) {
        const h = await harness({ status: "CLOSED", bonusTotal, salesTotal: 1_010_000 });
        assert.equal((await h.summary("shift")).summary?.calculatedBonus, bonusTotal);
        assert.deepEqual(h.writes, []);
    }
    const open = await harness({ salesTotal: 1_010_000 });
    assert.equal((await open.summary("shift")).summary?.calculatedBonus, 11_000);
});
