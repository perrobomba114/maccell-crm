import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { strict as assert } from "node:assert";

test("technical worker catalog scope follows the mounted physical inventory", () => {
    const source = readFileSync(resolve(process.cwd(), "scripts/index-technical-library.ts"), "utf8");

    assert.match(source, /WHERE id = ANY\(\$1::text\[\]\)/);
    assert.match(source, /discoverPhysicalAssets\(root, local\)/);
    assert.match(source, /return mergeCatalogAssets\(physical, stored\)/);
    assert.match(source, /reconcileAssetIdForPath\(client, asset\)/);
    assert.match(source, /assets SET id=\$1 WHERE id=\$2/);
    assert.doesNotMatch(source, /SELECT metadata FROM schematics\.assets ORDER BY kind,relative_path\)\.rows\.map/);
});
