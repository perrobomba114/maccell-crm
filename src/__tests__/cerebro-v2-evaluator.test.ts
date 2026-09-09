import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("evaluation uses the production diagnosis service and excludes legacy generation", async () => {
    const source = await readFile("scripts/cerebro-v2-evaluate.ts", "utf8");

    assert.match(source, /import \{ diagnoseRepair \} from "@\/lib\/cerebro-v2\/diagnosis-service"/);
    assert.match(source, /await diagnoseRepair\(/);
    assert.doesNotMatch(source, /generateText|buildCerebroSystemPrompt|retrieveCerebroSources/);
});

test("evaluation loads a real repair without mutating CRM data", async () => {
    const source = await readFile("scripts/cerebro-v2-evaluate.ts", "utf8");

    assert.match(source, /prisma\.repair\.findUniqueOrThrow/);
    assert.doesNotMatch(source, /\.create\(|\.update\(|\.delete\(|\.upsert\(/);
    assert.match(source, /ticketNumber: repair\.ticketNumber/);
});
