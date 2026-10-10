import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const bundle = build({
    entryPoints: [new URL("../actions/pos/checkout.ts", import.meta.url).pathname],
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "checkout-boundaries", setup(builder) {
        const stubs: Record<string, string> = {
            "@/actions/auth-actions": 'export async function getCurrentUser(){return {id:"vendor",role:"VENDOR",branch:{id:"branch"}}}',
            "./checkout-db": 'export async function saveSaleTransaction(data){__amountDeps.saved.push(data);return {transactionResult:{saleId:"test",saleNumber:"test"},negativeStockItems:[]}}',
            "./checkout-afip": 'export async function generateAfipInvoiceForSale(){__amountDeps.providers.push("AFIP");return {totalNet:0,totalVat:0}}',
            "./checkout-notifications": 'export async function sendPostSaleNotifications(){}',
            "../invoice-summary-helpers": 'export function normalizeFiscalEntityFromBranch(){return "MACCELL"}',
            "@/lib/db": 'export const db={repair:{findMany:async()=>[]}}',
            "next/cache": 'export function revalidatePath(){}',
        };
        builder.onResolve({ filter: /.*/ }, args => args.path in stubs ? { path: args.path, namespace: "amount-test" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "amount-test" }, args => ({ contents: stubs[args.path], loader: "js" }));
    } }],
});

type Input = Parameters<typeof import("../actions/pos/checkout").processPosSale>[0];
async function harness() {
    const deps = { saved: [] as Input[], providers: [] as string[] };
    const mod = { exports: {} as { processPosSale: (data: Input) => Promise<{ success: boolean }> } };
    new Function("require", "module", "exports", "__amountDeps", (await bundle).outputFiles[0].text)(require, mod, mod.exports, deps);
    return { ...deps, submit: mod.exports.processPosSale };
}
const input: Input = { vendorId: "vendor", branchId: "branch", total: 10_000, paymentMethod: "CASH", payments: [{ method: "CASH", amount: 10_000 }], items: [{ type: "PRODUCT", id: "item", name: "Test", quantity: 1, price: 10_000 }] };

test("single cash overpayment is rejected before persistence or a fiscal provider", async () => {
    const h = await harness();
    assert.equal((await h.submit({ ...input, payments: [{ method: "CASH", amount: 11_000 }], invoiceData: { generate: true, salesPoint: 1, invoiceType: "B", docType: "FINAL", docNumber: "0", customerName: "Test" } })).success, false);
    assert.deepEqual(h.saved, []);
    assert.deepEqual(h.providers, []);
});

test("item discrepancies are rejected even when header and payments agree", async () => {
    const h = await harness();
    assert.equal((await h.submit({ ...input, items: [{ ...input.items[0], price: 9_000 }] })).success, false);
    assert.deepEqual(h.saved, []);
});

test("exact payments and repairs delivered without payment still reach persistence", async () => {
    const h = await harness();
    assert.equal((await h.submit(input)).success, true);
    assert.equal((await h.submit({ ...input, total: 0, paymentMethod: "SPLIT", payments: [], items: [{ type: "REPAIR", id: "repair", name: "Test", quantity: 1, price: 0 }] })).success, true);
    assert.equal(h.saved.length, 2);
});
