import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(new URL("../../Dockerfile", import.meta.url), "utf8");
const entrypoint = readFileSync(new URL("../../scripts/start-with-technical-worker.sh", import.meta.url), "utf8");
const verifySql = readFileSync(
    new URL("../../scripts/db/verify-production-migration-baseline.sql", import.meta.url),
    "utf8",
);
const triggerSql = readFileSync(
    new URL("../../scripts/db/repair-repair-chat-trigger.sql", import.meta.url),
    "utf8",
);

test("production baseline verifies every pre-existing migration object", () => {
    assert.match(verifySql, /repair_learning_records/);
    assert.match(verifySql, /RepairAccessType/);
    assert.match(verifySql, /repair_chat_read_cursors/);
    assert.match(verifySql, /RAISE EXCEPTION/);
    assert.doesNotMatch(verifySql, /DROP\s+(?:TABLE|TYPE)/i);
});

test("chat trigger repair is transactional and idempotent", () => {
    assert.match(triggerSql, /^BEGIN;/m);
    assert.match(triggerSql, /CREATE OR REPLACE FUNCTION notify_repair_chat_change/);
    assert.match(triggerSql, /DROP TRIGGER IF EXISTS repair_chat_change_notify/);
    assert.match(triggerSql, /CREATE TRIGGER repair_chat_change_notify/);
    assert.match(triggerSql, /^COMMIT;/m);
});

test("production startup uses migrations without destructive db push", () => {
    assert.match(dockerfile, /CMD \["sh", "scripts\/start-with-technical-worker\.sh"\]/);
    assert.match(entrypoint, /prisma\/build\/index\.js migrate deploy/);
    assert.ok(entrypoint.indexOf("migrate deploy") < entrypoint.indexOf("technical-worker.cjs"));
    assert.ok(entrypoint.indexOf("migrate deploy") < entrypoint.indexOf("node server.js"));
    assert.doesNotMatch(dockerfile + entrypoint, /db push/);
    assert.doesNotMatch(dockerfile + entrypoint, /accept-data-loss/);
});
