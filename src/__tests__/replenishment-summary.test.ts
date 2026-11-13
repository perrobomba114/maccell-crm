import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeReplenishment } from "../lib/replenishment-summary";

test("la sucursal con ventas y sin existencias no hereda el stock de otra", () => {
    const local = { id: "a", name: "Centro" };
    const other = { id: "b", name: "Norte" };
    const products = [{ id: "p", name: "Funda", stock: [{ branchId: "b", quantity: 100 }] }];
    const items = [{ productId: "p", sale: { branchId: "a" } }];
    const sales = new Map([["p", { quantity: 1 }]]);
    const selected = summarizeReplenishment(products, [local], items, sales, local.id);
    assert.equal(selected.replenishmentSuggestions[0].suggestedQuantity, 10);
    assert.equal(selected.replenishmentSuggestions[0].branch, "Centro");
    const all = summarizeReplenishment(products, [local, other], items, sales);
    assert.equal(all.replenishmentSuggestions.length, 0);
    assert.deepEqual(all.stockByBranch, [{ name: "Centro", count: 1 }, { name: "Norte", count: 0 }]);
});
