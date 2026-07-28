import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../app/api/repair-chats/${path}`, import.meta.url), "utf8");

test("private chat routes authenticate before reading request data", () => {
    for (const path of [
        "route.ts",
        "search/route.ts",
        "[repairId]/messages/route.ts",
        "[repairId]/read/route.ts",
        "[repairId]/messages/[messageId]/readers/route.ts",
    ]) {
        const source = read(path);
        assert.match(source, /getCurrentUser\(\)/, path);
        assert.match(source, /force-dynamic/, path);
        const authIndex = source.indexOf("getCurrentUser()");
        const bodyIndex = source.indexOf("request.json()");
        if (bodyIndex >= 0) assert.ok(authIndex < bodyIndex, `${path} must authenticate before JSON parsing`);
    }
});
