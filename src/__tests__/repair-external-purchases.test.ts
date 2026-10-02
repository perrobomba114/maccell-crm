import assert from "node:assert/strict";
import test from "node:test";
import { externalPurchaseSchema, canAccessExternalPurchases } from "../lib/repairs/external-purchases";

const purchase = { requestId: "5771efde-9924-4c8c-b531-8b72c6fb4f38", description: "Módulo G9", supplier: "Proveedor de prueba", quantity: 2, unitCost: "12000,50", purchasedAt: "2026-10-01" };

test("external purchases normalize ARS decimals and preserve purchase date", () => {
    const result = externalPurchaseSchema.parse(purchase);
    assert.equal(result.unitCost, "12000.50");
    assert.equal(result.purchasedAt, "2026-10-01");
});

test("reject invalid costs, quantities, supplier and dates before any write", () => {
    for (const unitCost of ["0", "-1", "Infinity", "NaN", "1e5", "12.000,50", "1.001", "1000000000"]) {
        assert.equal(externalPurchaseSchema.safeParse({ ...purchase, unitCost }).success, false, unitCost);
    }
    for (const quantity of [0, -1, 1.5, 1001, NaN]) {
        assert.equal(externalPurchaseSchema.safeParse({ ...purchase, quantity }).success, false);
    }
    for (const purchasedAt of ["2026-02-30", "2026-13-01", "invalid"]) {
        assert.equal(externalPurchaseSchema.safeParse({ ...purchase, purchasedAt }).success, false);
    }
    assert.equal(externalPurchaseSchema.safeParse({ ...purchase, supplier: " " }).success, false);
    assert.equal(externalPurchaseSchema.safeParse({ ...purchase, requestId: "" }).success, false);
});

test("internal purchase costs are restricted by role, assignment and branch", () => {
    const repair = { branchId: "branch-a", assignedUserId: "tech-a" };
    assert.equal(canAccessExternalPurchases({ id: "admin", role: "ADMIN" }, repair), true);
    assert.equal(canAccessExternalPurchases({ id: "vendor", role: "VENDOR", branch: { id: "branch-a" } }, repair), false);
    assert.equal(canAccessExternalPurchases({ id: "tech-a", role: "TECHNICIAN" }, repair), true);
    assert.equal(canAccessExternalPurchases({ id: "tech-b", role: "TECHNICIAN", branch: { id: "branch-a" } }, repair), true);
    assert.equal(canAccessExternalPurchases({ id: "tech-b", role: "TECHNICIAN", branch: { id: "branch-b" } }, repair), false);
    assert.equal(canAccessExternalPurchases({ id: "tech-b", role: "TECHNICIAN" }, repair), false);
});

test("date filters include both endpoints for date-only purchases", async () => {
    const { externalPurchaseFilters } = await import("../lib/repairs/external-purchase-filters");
    const filters = externalPurchaseFilters({ q: " Proveedor ", from: "2026-10-01", to: "2026-10-02" });
    assert.equal(filters.error, null);
    assert.equal(filters.q, "Proveedor");
    assert.deepEqual(filters.where.purchasedAt, {
        gte: new Date("2026-10-01T00:00:00.000Z"),
        lte: new Date("2026-10-02T00:00:00.000Z"),
    });
    assert.ok(filters.where.OR);
    assert.deepEqual(externalPurchaseFilters({ from: "2026-10-01" }).where.purchasedAt, { gte: new Date("2026-10-01T00:00:00.000Z") });
    assert.deepEqual(externalPurchaseFilters({ to: "2026-10-02" }).where.purchasedAt, { lte: new Date("2026-10-02T00:00:00.000Z") });
    assert.deepEqual(externalPurchaseFilters({}).where, {});
});

test("invalid or reversed periods cannot show unfiltered financial totals", async () => {
    const { externalPurchaseFilters } = await import("../lib/repairs/external-purchase-filters");
    for (const params of [{ from: "2026-02-30" }, { to: "invalid" }, { from: "2026-10-02", to: "2026-10-01" }]) {
        const filters = externalPurchaseFilters(params);
        assert.ok(filters.error);
        assert.deepEqual(filters.where.id, { in: [] });
    }
});

test("pagination preserves the date period and search without changing filter state", async () => {
    const { externalPurchaseFilters, externalPurchasePageUrl } = await import("../lib/repairs/external-purchase-filters");
    const filters = externalPurchaseFilters({ q: "Proveedor A", from: "2026-10-01", to: "2026-10-02", page: "2" });
    const next = new URLSearchParams(externalPurchasePageUrl(filters.query, 3).slice(1));
    assert.equal(next.get("page"), "3");
    assert.equal(next.get("q"), "Proveedor A");
    assert.equal(next.get("from"), "2026-10-01");
    assert.equal(next.get("to"), "2026-10-02");
    assert.equal(filters.query.has("page"), false);
});
