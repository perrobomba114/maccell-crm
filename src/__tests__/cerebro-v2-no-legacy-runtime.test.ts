import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("does not ship the old Wiki, chat or token runtime", () => {
    const retiredPaths = [
      "src/components/cerebro/cerebro-layout.tsx",
      "src/components/cerebro/knowledge-panel.tsx",
      "src/components/cerebro/schematic-upload-panel.tsx",
      "src/app/api/cerebro/chat/route.ts",
      "src/app/api/cerebro/knowledge/route.ts",
      "src/app/api/cerebro/schematics/route.ts",
      "src/app/api/cerebro/summarize/route.ts",
      "src/app/api/cerebro/tokens/route.ts",
      "scripts/seed-wiki-from-repairs.ts",
      "scripts/populate-wiki.js",
      "scripts/reindex-repairs.ts",
    ];

  assert.deepEqual(retiredPaths.filter((path) => existsSync(join(root, path))), []);
});

test("mounts only the V2 shell in both technician roles", () => {
  for (const page of ["src/app/admin/cerebro/page.tsx", "src/app/technician/cerebro/page.tsx"]) {
    const source = readFileSync(join(root, page), "utf8");
    assert.match(source, /CerebroV2Shell/);
    assert.doesNotMatch(source, /CerebroLayout/);
    assert.doesNotMatch(source, /Wiki/);
  }
});

test("repair completion no longer writes to the legacy embedding store", () => {
  const action = readFileSync(join(root, "src/actions/repairs/tech-status.ts"), "utf8");
  const packageJson = readFileSync(join(root, "package.json"), "utf8");
  assert.doesNotMatch(action, /cerebro-indexer|indexRepair/);
  assert.doesNotMatch(packageJson, /wiki:sync|wiki:reindex/);
});
