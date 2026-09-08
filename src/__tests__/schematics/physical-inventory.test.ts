import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { discoverPhysicalAssets } from "../../lib/schematics/physical-inventory";
import { sameDevice } from "../../lib/schematics/catalog-types";

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

test("physical inventory pairs brand-prefixed model folders across Pdf and Pcbe", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "maccell-inventory-prefixed-"));
    await mkdir(path.join(root, "sources", "Samsung A15 5G SM-A1560", "Pdf"), { recursive: true });
    await mkdir(path.join(root, "sources", "Samsung A15 5G SM-A1560", "Pcbe"), { recursive: true });
    await writeFile(path.join(root, "sources", "Samsung A15 5G SM-A1560", "Pdf", "service.pdf"), "%PDF-1.7");
    await writeFile(path.join(root, "sources", "Samsung A15 5G SM-A1560", "Pcbe", "board.pcbe"), "XZZPCB V1.0");

    const assets = await discoverPhysicalAssets(root, [{
        id: "pdf", name: "old.pdf", kind: "pdf", brand: "Samsung A15 5G SM-A1560", model: "Pdf", modelKey: "pdf",
        relativePath: "sources/Samsung A15 5G SM-A1560/Pdf/service.pdf", size: 7, sha256: "a".repeat(64), status: "ready",
    }]);

    assert.deepEqual(assets.map((asset) => ({ brand: asset.brand, model: asset.model, modelKey: asset.modelKey })), [
        { brand: "SAMSUNG", model: "A15 5G", modelKey: "a155g" },
        { brand: "SAMSUNG", model: "A15 5G", modelKey: "a155g" },
    ]);
});

test("physical inventory reconciles legacy Samsung folders by commercial model", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "maccell-inventory-samsung-"));
    const files = [
        ["sources/Samsung A03s/Pcbe/A03s board.pcbe", "XZZPCB V1.0"],
        ["sources/Samsung A03s/Pdf/A03s schematic.pdf", "%PDF-1.7"],
        ["sources/pcbe/SAMSUNG/A series(VIP)/A03s 96516/A03s alternate.pcbe", "XZZPCB V1.0"],
        ["sources/pdf/SAMSUNG/A series(VIP)/A03s 96516/A03s alternate schematic.pdf", "%PDF-1.7"],
    ] as const;
    for (const [file, content] of files) {
        await mkdir(path.dirname(path.join(root, file)), { recursive: true });
        await writeFile(path.join(root, file), content);
    }

    const assets = await discoverPhysicalAssets(root, []);
    assert.deepEqual(new Set(assets.map((asset) => asset.modelKey)), new Set(["a03s"]));
    assert.equal(assets.every((asset) => asset.brand === "SAMSUNG"), true);
    assert.equal(sameDevice(assets[0]!, assets[1]!), true);
    assert.equal(sameDevice(assets[0]!, assets[2]!), true);
});

test("commercial Samsung normalization keeps A03 and A03s separate", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "maccell-inventory-samsung-separate-"));
    for (const [folder, name] of [["Samsung A03 SM-A035", "board.pcbe"], ["Samsung A03s SM-A037M", "board.pcbe"]] as const) {
        await mkdir(path.join(root, "sources", folder, "Pcbe"), { recursive: true });
        await writeFile(path.join(root, "sources", folder, "Pcbe", name), "XZZPCB V1.0");
    }

    const assets = await discoverPhysicalAssets(root, []);
    assert.deepEqual(assets.map((asset) => asset.modelKey), ["a03", "a03s"]);
    assert.equal(sameDevice(assets[0]!, assets[1]!), false);
});

test("console identity keeps model folders and ignores document roles", async () => {
    const { declaredIdentity } = await import('../../lib/schematics/physical-inventory');
    assert.deepEqual(declaredIdentity('sources/pcbe/Nintendo/SWITCH2/PCB layer/board.pcb', 'board.pcb'), { brand: 'NINTENDO', model: 'SWITCH2' });
    assert.deepEqual(declaredIdentity('sources/pdf/SONY/PS5/Schematic and boardview/service.pdf', 'service.pdf'), { brand: 'SONY', model: 'PS5' });
    assert.deepEqual(declaredIdentity('sources/pcbe/XBOX/Xbox Series S(VIP)/board.pcbe', 'board.pcbe'), { brand: 'XBOX', model: 'Xbox Series S' });
});

test("same-size file replacement invalidates the inventory hash", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'inventory-hash-'));
    await writeFile(path.join(root, 'test.pdf'), '%PDF-one');
    const [old] = await discoverPhysicalAssets(root, []);
    await writeFile(path.join(root, 'test.pdf'), '%PDF-two');
    const [updated] = await discoverPhysicalAssets(root, [{ ...old, fileMtimeMs: 0 }]);
    assert.notEqual(updated.sha256, old.sha256);
});
