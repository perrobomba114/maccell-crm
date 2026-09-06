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

test("buildDirectoryTree constructs hierarchical folders and strips technical prefix", () => {
  const assets: SchematicAsset[] = [
    mockAsset("1", "pcbe/iPhone(VIP)/iPhone11/Diode value/iPhone-11-BC surface.pcbe", "iPhone-11-BC surface.pcbe", "pcbe"),
    mockAsset("2", "pcbe/iPhone(VIP)/iPhone11/Schematic and boardview/iPhone11 AP+BB PCB layer.pcbe", "iPhone11 AP+BB PCB layer.pcbe", "pcbe"),
    mockAsset("3", "pdf/iPhone(VIP)/iPhone11/Schematic and boardview/iPhone11 Schematics.pdf", "iPhone11 Schematics.pdf", "pdf"),
    mockAsset("4", "bulk/iPhone 11-A surface.pcbe", "iPhone 11-A surface.pcbe", "pcbe"),
  ];

  const tree = buildDirectoryTree(assets);
  assert.equal(tree.length, 2); // 'iPhone(VIP)' and 'bulk'

  const bulkNode = tree.find((n) => n.name === "bulk");
  assert.ok(bulkNode);
  assert.equal(bulkNode.files.length, 1);
  assert.equal(bulkNode.totalFiles, 1);

  const vipNode = tree.find((n) => n.name === "iPhone(VIP)");
  assert.ok(vipNode);
  assert.equal(vipNode.totalFiles, 3);
  assert.equal(vipNode.subfolders.size, 1); // 'iPhone11'

  const iphone11Node = vipNode.subfolders.get("iPhone11");
  assert.ok(iphone11Node);
  assert.equal(iphone11Node.subfolders.size, 2); // 'Diode value' and 'Schematic and boardview'

  const diodeNode = iphone11Node.subfolders.get("Diode value");
  assert.ok(diodeNode);
  assert.equal(diodeNode.files.length, 1);
  assert.equal(diodeNode.files[0].id, "1");

  const schemNode = iphone11Node.subfolders.get("Schematic and boardview");
  assert.ok(schemNode);
  assert.equal(schemNode.files.length, 2);
  assert.equal(schemNode.totalFiles, 2);
});

test("nodeContainsAsset finds asset recursively", () => {
  const assets: SchematicAsset[] = [
    mockAsset("target-123", "pcbe/iPhone(VIP)/iPhone13/Schematic/layer.pcbe", "layer.pcbe", "pcbe"),
  ];
  const tree = buildDirectoryTree(assets);
  const rootVip = tree.find((n) => n.name === "iPhone(VIP)");
  assert.ok(rootVip);
  assert.equal(nodeContainsAsset(rootVip, "target-123"), true);
  assert.equal(nodeContainsAsset(rootVip, "non-existent"), false);
});
