import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import * as upload from "../lib/actions/upload";
import * as conversion from "../lib/repair-image-conversion";
import * as finishParts from "../lib/repairs/finish-parts-policy";
import * as externalPurchases from "../lib/repairs/external-purchases";
import * as reactivation from "../lib/repairs/reactivation-policy";
import * as status from "../lib/repairs/status";
import * as statusSets from "../lib/repairs/status-sets";
import { materializeRepairImageFiles, MAX_CLIENT_REPAIR_IMAGE_BYTES } from "../lib/repairs/client-image-files";
import nextConfig from "../../next.config";

// Execute the production action with its actual storage/conversion code and
// request/DB doubles, without opening a connection or changing production data.
async function loadFinishAction(transaction: () => Promise<void>) {
    const source = await readFile(new URL("../actions/repairs/finish.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const dependencies = new Map<string, unknown>([
        ["@/actions/auth-actions", { getCurrentUser: async () => ({ id: "tech-a", role: "TECHNICIAN" }) }],
        ["@/lib/db", { db: {
            repair: { findUnique: async () => ({ id: "repair-a", ticketNumber: "TEST", assignedUserId: "tech-a", statusId: status.REPAIR_STATUS.IN_PROGRESS, deviceImages: [], parts: [] }) },
            $transaction: transaction,
        } }],
        ["@/lib/actions/notifications", { createNotificationAction: async () => undefined }],
        ["next/cache", { revalidatePath: () => undefined }],
        ["@/lib/actions/upload", upload],
        ["@/lib/repair-image-conversion", conversion],
        ["@/lib/repairs/finish-parts-policy", finishParts],
        ["@/lib/repairs/external-purchases", externalPurchases],
        ["@/lib/repairs/reactivation-policy", reactivation],
        ["@/lib/repairs/status", status],
        ["@/lib/repairs/status-sets", statusSets],
    ]);
    const actionModule = { exports: {} };
    vm.runInNewContext(compiled, {
        module: actionModule, exports: actionModule.exports, Date, Set,
        console: { error: () => undefined },
        require: (name: string) => {
            if (!dependencies.has(name)) throw new Error(`Unexpected import: ${name}`);
            return dependencies.get(name);
        },
    });
    return vm.runInNewContext("actionModule.exports.finishRepairAction", { actionModule });
}

test("invalid evidence prevents finishing and DB failure cleans newly uploaded files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "maccell-finish-evidence-"));
    const previous = process.cwd();
    let transactions = 0;
    const finish = await loadFinishAction(async () => {
        transactions++;
        throw new Error("Simulated database failure");
    });
    try {
        process.chdir(root);
        const form = new FormData();
        form.set("repairId", "repair-a");
        form.set("technicianId", "tech-a");
        form.set("statusId", String(status.REPAIR_STATUS.OK));
        form.set("diagnosis", "Reparación verificada");
        form.set("partsRequired", "false");
        form.append("images", new File(["corrupt"], "camera.jpg", { type: "image/jpeg" }));
        const rejected = await finish(form);
        assert.equal(rejected.success, false);
        assert.match(rejected.error, /No se pudo leer la foto/);
        assert.equal(transactions, 0, "no state/history writes may happen after an evidence error");

        const realHeic = await readFile(new URL("./fixtures/repair-images/example.heic", import.meta.url));
        form.delete("images");
        form.append("images", new File([realHeic], "camera.heic", { type: "image/heic" }));
        const failedDb = await finish(form);
        assert.equal(failedDb.success, false);
        assert.equal(transactions, 1);
        assert.deepEqual(await readdir(path.join(root, "upload/repairs/images")), []);
    } finally {
        process.chdir(previous);
        await rm(root, { recursive: true, force: true });
    }
});

test("middleware body size limit matches server actions limit so multi-photo repair uploads are not truncated at 10MB", () => {
    assert.equal(nextConfig.experimental?.middlewareClientMaxBodySize, "500mb");
    assert.equal(nextConfig.experimental?.serverActions?.bodySizeLimit, "500mb");
});

test("client repair image materialization clones bytes into memory and validates limits before clearing file inputs", async () => {
    const sourceFile = new File([Buffer.from("jpeg-bytes")], "foto-1.jpg", {
        type: "image/jpeg",
        lastModified: 1700000000000,
    });
    const ok = await materializeRepairImageFiles([sourceFile], 1);
    assert.equal(ok.ok, true);
    if (ok.ok) {
        assert.equal(ok.files.length, 1);
        assert.notEqual(ok.files[0], sourceFile);
        assert.equal(ok.files[0].name, "foto-1.jpg");
        assert.equal(Buffer.from(await ok.files[0].arrayBuffer()).toString(), "jpeg-bytes");
    }

    const tooMany = await materializeRepairImageFiles([sourceFile, sourceFile], 2);
    assert.deepEqual(tooMany, { ok: false, error: "Máximo 3 imágenes." });

    const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
    const emptyRes = await materializeRepairImageFiles([emptyFile], 0);
    assert.equal(emptyRes.ok, false);

    const unreadableFile = {
        name: "revoked.jpg",
        size: 1024,
        type: "image/jpeg",
        lastModified: Date.now(),
        arrayBuffer: async () => {
            throw new Error("NotReadableError");
        },
    } as unknown as File;
    const unreadableRes = await materializeRepairImageFiles([unreadableFile], 0);
    assert.equal(unreadableRes.ok, false);
    if (!unreadableRes.ok) {
        assert.match(unreadableRes.error, /No se pudo leer la foto/);
    }

    const oversizedFile = {
        name: "huge.jpg",
        size: MAX_CLIENT_REPAIR_IMAGE_BYTES + 1,
        type: "image/jpeg",
        lastModified: Date.now(),
        arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;
    const oversizedRes = await materializeRepairImageFiles([oversizedFile], 0);
    assert.equal(oversizedRes.ok, false);
    if (!oversizedRes.ok) {
        assert.match(oversizedRes.error, /30 MB/);
    }
});
