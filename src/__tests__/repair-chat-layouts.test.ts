import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mounts one repair chat provider in every internal role layout", () => {
    for (const path of ["app/admin/layout.tsx", "app/vendor/vendor-layout-client.tsx", "app/technician/layout.tsx"]) {
        const source = read(path);
        assert.match(source, /RepairChatProvider/, path);
        assert.equal((source.match(/<RepairChatProvider/g) ?? []).length, 1, path);
        assert.match(source, /userId=/, path);
    }
});
