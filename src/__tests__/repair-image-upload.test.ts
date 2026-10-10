import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { saveRepairImages } from "../lib/actions/upload";
import { canManageRepairImages } from "../lib/repairs/image-permissions";

test("filesystem helpers are not exposed as independently callable server actions", async () => {
    const source = await readFile(new URL("../lib/actions/upload.ts", import.meta.url), "utf8");
    const parsedSource = ts.createSourceFile("upload.ts", source, ts.ScriptTarget.Latest, true);
    const serverDirectives: ts.StringLiteral[] = [];
    const visit = (node: ts.Node) => {
        if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === "use server") {
            serverDirectives.push(node.expression);
        }
        ts.forEachChild(node, visit);
    };
    visit(parsedSource);
    assert.equal(serverDirectives.length, 0, "only authenticated repair actions may expose these storage operations");
});

test("failed second photo leaves no partial evidence files", async () => {
    const input = await readFile(new URL("./fixtures/repair-images/example.heic", import.meta.url));
    const root = await mkdtemp(path.join(os.tmpdir(), "maccell-image-batch-"));
    const previous = process.cwd();
    try {
        process.chdir(root);
        const form = new FormData();
        form.append("images", new File([input], "real.heic", { type: "image/heic" }));
        form.append("images", new File(["broken image"], "broken.jpg", { type: "image/jpeg" }));
        await assert.rejects(() => saveRepairImages(form, "MAC1-TEST"), /No se pudo leer la foto/);
        assert.deepEqual(await readdir(path.join(root, "upload/repairs/images")), []);
        form.delete("images");
        form.append("images", new File([input], "real.heic", { type: "image/heic" }));
        const saved = await saveRepairImages(form, "MAC1-TEST");
        assert.equal(saved.length, 1);
        assert.match(saved[0], /^\/api\/uploads\/repairs\/images\/MAC1-TEST_/);
        assert.equal((await readdir(path.join(root, "upload/repairs/images"))).length, 1);
    } finally {
        process.chdir(previous);
        await rm(root, { recursive: true, force: true });
    }
});

test("repair photo access follows role, branch and assigned technician", () => {
    const repair = { branchId: "branch-a", assignedUserId: "tech-a" };
    assert.equal(canManageRepairImages(null, repair), false);
    assert.equal(canManageRepairImages({ id: "admin", role: "ADMIN", branch: null }, repair), true);
    assert.equal(canManageRepairImages({ id: "vendor", role: "VENDOR", branch: { id: "branch-a" } }, repair), true);
    assert.equal(canManageRepairImages({ id: "vendor", role: "VENDOR", branch: { id: "branch-b" } }, repair), false);
    assert.equal(canManageRepairImages({ id: "vendor", role: "VENDOR", branch: null }, repair), false);
    assert.equal(canManageRepairImages({ id: "tech-a", role: "TECHNICIAN", branch: null }, repair), true);
    assert.equal(canManageRepairImages({ id: "tech-b", role: "TECHNICIAN", branch: { id: "branch-a" } }, repair), false);
});
