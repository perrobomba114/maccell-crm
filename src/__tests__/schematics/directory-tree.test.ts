import assert from "node:assert/strict";
import test from "node:test";
import { buildDirectoryTree, nodeContainsAsset } from "../../lib/schematics/tree";
import type { SchematicAsset } from "../../lib/schematics/catalog-types";

function mockAsset(id: string, relativePath: string, name: string, kind: "pcbe" | "pdf" = "pcbe"): SchematicAsset {
  return {
    id,
    name,
    kind,
    model: "iPhone 11",
    modelKey: "iphone11",
    relativePath,
    size: 1000,
    sha256: id.padEnd(64, "0"),
    status: "ready",
  };
}

test("buildDirectoryTree constructs canonical brand/model/type folders", () => {
  const assets: SchematicAsset[] = [
    mockAsset("1", "pcbe/iPhone(VIP)/iPhone11/Diode value/iPhone-11-BC surface.pcbe", "iPhone-11-BC surface.pcbe", "pcbe"),
    mockAsset("2", "pcbe/iPhone(VIP)/iPhone11/Schematic and boardview/iPhone11 AP+BB PCB layer.pcbe", "iPhone11 AP+BB PCB layer.pcbe", "pcbe"),
    mockAsset("3", "pdf/iPhone(VIP)/iPhone11/Schematic and boardview/iPhone11 Schematics.pdf", "iPhone11 Schematics.pdf", "pdf"),
    mockAsset("4", "bulk/iPhone 11-A surface.pcbe", "iPhone 11-A surface.pcbe", "pcbe"),
  ];

  const tree = buildDirectoryTree(assets);
  assert.equal(tree.length, 2); // Apple and Otros
  const bulkNode = tree.find((n) => n.name === "Otros");
  assert.ok(bulkNode);
  assert.equal(bulkNode?.totalFiles, 1);

  const vipNode = tree.find((n) => n.name === "Apple");
  assert.ok(vipNode);
  assert.equal(vipNode.totalFiles, 3);
  assert.equal(vipNode.subfolders.size, 1); // 'iPhone11'

  const iphone11Node = vipNode.subfolders.get("iPhone11");
  assert.ok(iphone11Node);
  assert.equal(iphone11Node.subfolders.has("Placas"), true);
  assert.equal(iphone11Node.subfolders.has("Esquemáticos"), true);
});

test("normalizes noisy vendor folders into commercial Samsung models", () => {
  const tree = buildDirectoryTree([
    Object.assign(mockAsset("a03", "sources/Samsung A03 Core SM-A032F/Pdf/a03.pdf", "a03 schematic.pdf", "pdf"), { brand: "SAMSUNG", model: "Samsung A03 Core SM-A032F" }),
    Object.assign(mockAsset("j3300", "sources/Samsung 7 01 SM-J3300/Pdf/j3300.pdf", "j3300 schematic.pdf", "pdf"), { brand: "SAMSUNG", model: "Samsung 7 01 SM-J3300" }),
  ]);

  const samsung = tree.find((node) => node.name === "Samsung");
  assert.ok(samsung);
  assert.ok(samsung.subfolders.has("A03 Core"));
  assert.ok(samsung.subfolders.has("SM-J3300"));
  assert.equal(samsung.subfolders.has("Samsung A03 Core SM-A032F"), false);
});

test("nodeContainsAsset finds asset recursively", () => {
  const assets: SchematicAsset[] = [
    mockAsset("target-123", "pcbe/iPhone(VIP)/iPhone13/Schematic/layer.pcbe", "layer.pcbe", "pcbe"),
  ];
  const tree = buildDirectoryTree(assets);
  const rootVip = tree.find((n) => n.name === "Apple");
  assert.ok(rootVip);
  assert.equal(nodeContainsAsset(rootVip, "target-123"), true);
  assert.equal(nodeContainsAsset(rootVip, "non-existent"), false);
});

test("directory tree groups consoles and removes source labels", () => {
  const tree = buildDirectoryTree([
    mockAsset("console-board", "pcbe/PlayStation(Official)/PlayStation 4/board.pcbe", "board.pcbe", "pcbe"),
    mockAsset("console-pdf", "pdf/PlayStation(Official)/PlayStation 4/PS4 schematic.pdf", "PS4 schematic.pdf", "pdf"),
  ]);
  const consoleNode = tree.find((node) => node.name === "PlayStation");
  assert.ok(consoleNode);
  assert.ok(consoleNode.subfolders.has("PlayStation 4"));
});

test("directory tree hides the physical sources prefix used by production mounts", () => {
  const tree = buildDirectoryTree([
    mockAsset("source-1", "sources/Xiaomi/Redmi 9/Pdf/Redmi 9.pdf", "Redmi 9.pdf", "pdf"),
  ]);

  assert.equal(tree[0]?.name, "Xiaomi");
  assert.equal(tree[0]?.subfolders.get("Redmi 9")?.totalFiles, 1);
});

test("directory tree turns noisy brand-prefixed folders into manufacturer groups", () => {
  const tree = buildDirectoryTree([
    Object.assign(mockAsset("redmi-board", "pcbe/RedMi G Ryzen 2021 game RTX3060 bm5104 ver1.5/board.pcbe", "board.pcbe"), { brand: "RedMi G Ryzen 2021 game RTX3060 bm5104 ver1.5", model: "BM5104" }),
    Object.assign(mockAsset("unknown-board", "pcbe/2、PC Motherboard/board.pcbe", "board.pcbe"), { brand: "2、PC Motherboard", model: "PC Motherboard" }),
  ]);

  assert.ok(tree.some((node) => node.name === "Xiaomi"));
  assert.ok(tree.some((node) => node.name === "Otros"));
  assert.equal(tree.some((node) => node.name.includes("RedMi G Ryzen")), false);
  assert.equal(tree.some((node) => node.name.includes("2、PC Motherboard")), false);
});
