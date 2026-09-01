import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const historyTableSource = readFileSync(
    new URL("../components/repairs/history-repairs-table.tsx", import.meta.url),
    "utf8",
);
const historyRowSource = readFileSync(
    new URL("../components/repairs/repair-history-row.tsx", import.meta.url),
    "utf8",
);
const historyCardSource = readFileSync(
    new URL("../components/repairs/repair-history-card.tsx", import.meta.url),
    "utf8",
);

test("history desktop and mobile surfaces expose vendor reactivation", () => {
    assert.match(historyTableSource, /reactivateRepairAction/);
    assert.match(historyRowSource, /Reactivar para técnico/);
    assert.match(historyCardSource, /Reactivar para técnico/);
});

test("history action refreshes after successful reactivation", () => {
    assert.match(historyTableSource, /router\.refresh\(\)/);
});
