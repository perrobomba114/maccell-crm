import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const summarySource = readFileSync(
    new URL("../components/repairs/repair-intake-summary.tsx", import.meta.url),
    "utf8",
);
const takeDialogSource = readFileSync(
    new URL("../components/repairs/take-repair-dialog.tsx", import.meta.url),
    "utf8",
);
const startModalSource = readFileSync(
    new URL("../components/repairs/start-repair-modal.tsx", import.meta.url),
    "utf8",
);
const adminEditPageSource = readFileSync(
    new URL("../app/admin/repairs/[repairId]/edit/page.tsx", import.meta.url),
    "utf8",
);
const publicRouteSource = readFileSync(
    new URL("../app/api/public/repair-status/route.ts", import.meta.url),
    "utf8",
);

test("private repair workflows render the received access summary", () => {
    assert.match(summarySource, /accessCredential/);
    assert.match(takeDialogSource, /<RepairIntakeSummary/);
    assert.match(startModalSource, /<RepairIntakeSummary/);
    assert.match(adminEditPageSource, /<RepairIntakeSummary/);
});

test("public repair status never serializes the access credential", () => {
    assert.doesNotMatch(publicRouteSource, /accessCredential/);
});
