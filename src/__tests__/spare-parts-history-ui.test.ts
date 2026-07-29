import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("spare part history uses a deterministic database order", () => {
    const action = read("actions/spare-parts/history.ts");

    assert.match(action, /orderBy:\s*\[\{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/);
    assert.match(action, /const nextIsChecked = !item\.isChecked/);
    assert.match(action, /return \{ success: true, isChecked: nextIsChecked \}/);
});

test("checking a spare part updates only local state and disables that row", () => {
    const hook = read("components/admin/spare-parts/use-spare-parts-history.ts");
    const client = read("components/admin/spare-parts/history-client.tsx");
    const toggleSection = hook.slice(hook.indexOf("const handleToggleCheck"), hook.indexOf("return {"));

    assert.match(toggleSection, /updateHistoryChecked/);
    assert.doesNotMatch(toggleSection, /router\.refresh\(\)/);
    assert.match(client, /checkingIds\.has\(item\.id\)/);
    assert.match(client, /disabled=\{checkingIds\.has\(item\.id\)\}/);
});
