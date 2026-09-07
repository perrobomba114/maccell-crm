import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { discoverPhysicalAssets } from "../../lib/schematics/physical-inventory";

test("physical inventory counts mounted files and drops stale catalog paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "maccell-inventory-"));
    await mkdir(path.join(root, "sources", "Samsung", "A72", "Pdf"), { recursive: true });
    await mkdir(path.join(root, "sources", "Samsung", "A72", "Pcbe"), { recursive: true });
    await writeFile(path.join(root, "sources", "Samsung", "A72", "Pdf", "service.pdf"), "%PDF-1.7");
    await writeFile(path.join(root, "sources", "Samsung", "A72", "Pcbe", "board.pcbe"), "XZZPCB V1.0");

    const assets = await discoverPhysicalAssets(root, [{
        id: "stale", name: "gone.pdf", kind: "pdf", brand: "Samsung", model: "A10", modelKey: "a10",
        relativePath: "sources/Samsung/A10/Pdf/gone.pdf", size: 1, sha256: "a".repeat(64), status: "ready",
    }]);

    assert.deepEqual(assets.map((asset) => asset.relativePath), [
        "sources/Samsung/A72/Pcbe/board.pcbe",
        "sources/Samsung/A72/Pdf/service.pdf",
    ]);
    assert.deepEqual(assets.map((asset) => asset.kind), ["pcbe", "pdf"]);
});
