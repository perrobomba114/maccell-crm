import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import { EXTERNAL_PURCHASE_EDITABLE_STATUSES } from "../lib/repairs/external-purchases";

const require = createRequire(import.meta.url);
const bundled = build({
    entryPoints: [new URL("../actions/repairs/finish.ts", import.meta.url).pathname],
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "finish-boundaries", setup(builder) {
        const stubs: Record<string, string> = {
            "@/lib/db": "export const db = __finishTestDeps.db;",
            "@/actions/auth-actions": "export const getCurrentUser = async () => __finishTestDeps.actor;",
            "@/lib/actions/upload": "export const saveRepairImages = async () => { if (__finishTestDeps.uploadError) throw new Error('Invalid photo'); return __finishTestDeps.uploadedImages; }; export const deleteRepairImageFile = async (url) => { __finishTestDeps.deletedImages.push(url); };",
            "@/lib/actions/notifications": "export const createNotificationAction = async () => {};",
            "next/cache": "export const revalidatePath = () => {};",
        };
        builder.onResolve({ filter: /.*/ }, args => args.path in stubs ? { path: args.path, namespace: "finish-test" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "finish-test" }, args => ({ contents: stubs[args.path], loader: "js" }));
    } }],
});

async function harness(options: { role?: string; local?: number; external?: number; lock?: number; uploadError?: boolean; uploadedImages?: string[] } = {}) {
    const writes: string[] = [];
    const deletedImages: string[] = [];
    const lockConditions: unknown[] = [];
    const db = {
        repair: {
            findUnique: async () => ({ id: "repair", assignedUserId: "tech", statusId: 3, parts: [], deviceImages: [], ticketNumber: "TEST", userId: null }),
            updateMany: async (query: { where: unknown }) => { lockConditions.push(query.where); return { count: options.lock ?? 1 }; },
            update: async () => { writes.push("repair"); },
        },
        repairPart: { count: async () => options.local ?? 0 },
        repairExternalPurchase: { count: async () => options.external ?? 0 },
        repairObservation: { create: async () => { writes.push("decision"); } },
        user: { findUnique: async () => null },
        repairStatus: { findUnique: async () => null },
        $transaction: async (run: (tx: unknown) => Promise<void>) => run(db),
    };
    const testModule = { exports: {} as { finishRepairAction: (data: FormData) => Promise<{ success: boolean; error?: string }> } };
    new Function("require", "module", "exports", "__finishTestDeps", (await bundled).outputFiles[0].text)(require, testModule, testModule.exports, {
        db, actor: { id: "tech", role: options.role ?? "TECHNICIAN" },
        uploadError: options.uploadError, uploadedImages: options.uploadedImages ?? [], deletedImages,
    });
    const submit = async (partsRequired?: string) => {
        const form = new FormData();
        for (const [key, value] of Object.entries({ repairId: "repair", technicianId: "tech", statusId: "5", diagnosis: "Informe de prueba" })) form.set(key, value);
        if (partsRequired !== undefined) form.set("partsRequired", partsRequired);
        return testModule.exports.finishRepairAction(form);
    };
    return { submit, writes, deletedImages, lockConditions };
}

test("finish rejects a forged technician role before changing the repair", async () => {
    const h = await harness({ role: "VENDOR", local: 1 });
    assert.equal((await h.submit("true")).success, false);
    assert.deepEqual(h.writes, []);
});

test("finish blocks missing decision and missing parts on the server", async () => {
    const h = await harness();
    assert.equal((await h.submit()).success, false);
    assert.equal((await h.submit("true")).success, false);
    assert.deepEqual(h.writes, []);
});

test("finish accepts local or external assignment and records the decision", async () => {
    for (const options of [{ local: 1 }, { external: 1 }]) {
        const h = await harness(options);
        assert.equal((await h.submit("true")).success, true);
        assert.deepEqual(h.writes, ["repair", "decision"]);
    }
});

test("finish accepts the explicit no-parts choice", async () => {
    const h = await harness();
    assert.equal((await h.submit("false")).success, true);
    assert.deepEqual(h.writes, ["repair", "decision"]);
});

test("finish rejects concurrent ownership or status changes", async () => {
    const h = await harness({ local: 1, lock: 0 });
    assert.equal((await h.submit("true")).success, false);
    assert.deepEqual(h.writes, []);
});

test("finish rejects failed evidence before updating any state or history", async () => {
    const h = await harness({ local: 1, uploadError: true });
    assert.equal((await h.submit("true")).success, false);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.lockConditions, []);
});

test("finish cleans uploaded evidence if the repair changed before commit", async () => {
    const uploadedImages = ["/api/uploads/repairs/images/TEST_0.jpg"];
    const h = await harness({ local: 1, lock: 0, uploadedImages });
    assert.equal((await h.submit("true")).success, false);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.deletedImages, uploadedImages);
    assert.deepEqual(h.lockConditions[0], {
        id: "repair", assignedUserId: "tech", statusId: 3, deviceImages: { equals: [] },
        AND: { statusId: { in: EXTERNAL_PURCHASE_EDITABLE_STATUSES } },
    });
});

test("finish keeps uploaded evidence after a successful commit", async () => {
    const h = await harness({ uploadedImages: ["/api/uploads/repairs/images/TEST_0.jpg"] });
    assert.equal((await h.submit("false")).success, true);
    assert.deepEqual(h.deletedImages, []);
});
