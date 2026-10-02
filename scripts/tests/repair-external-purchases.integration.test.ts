import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { recordExternalPurchases } from "../../src/lib/repairs/record-external-purchases";
import { externalPurchaseFilters } from "../../src/lib/repairs/external-purchase-filters";
import { consumeRepairParts } from "../../src/lib/repairs/consume-repair-parts";

const url = process.env.EXTERNAL_PURCHASE_TEST_DATABASE_URL;
test("external purchases persist atomically, preserve stock and tolerate concurrent retries", { skip: !url }, async () => {
    const target = new URL(url!);
    assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname.endsWith("_test"), "Usar exclusivamente una base local terminada en _test");
    const db = new PrismaClient({ datasources: { db: { url } } });
    const suffix = randomUUID();
    const branch = await db.branch.create({ data: { name: "Prueba compras externas", code: suffix } });
    const user = await db.user.create({ data: { name: "Técnico prueba", email: `${suffix}@example.test`, password: "unused", role: "TECHNICIAN", branchId: branch.id } });
    const customer = await db.customer.create({ data: { name: "Cliente prueba", phone: suffix, branchId: branch.id, userId: user.id } });
    const status = await db.repairStatus.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: "Pendiente" } });
    const repair = await db.repair.create({ data: { ticketNumber: suffix, branchId: branch.id, customerId: customer.id, userId: user.id, statusId: status.id, deviceBrand: "Prueba", deviceModel: "Prueba", problemDescription: "Prueba", promisedAt: new Date(), deviceImages: [] } });
    const part = await db.sparePart.create({ data: { name: "Stock prueba", sku: suffix, stockLocal: 5, priceArg: 100, brand: "Prueba" } });
    try {
        const purchase = { requestId: randomUUID(), description: "Módulo externo", supplier: "Proveedor prueba", quantity: 3, unitCost: "0.10", purchasedAt: "2026-10-01", receipt: "TEST-001" };
        await Promise.all(Array.from({ length: 8 }, () => db.$transaction(tx => recordExternalPurchases(tx, repair.id, user.id, [purchase]))));
        assert.equal(await db.repairExternalPurchase.count({ where: { repairId: repair.id } }), 1);
        const stored = await db.repairExternalPurchase.findFirstOrThrow({ where: { repairId: repair.id } });
        assert.equal(stored.totalCost.toFixed(2), "0.30");
        assert.equal(stored.userId, user.id);
        assert.equal(stored.purchasedAt.toISOString(), "2026-10-01T00:00:00.000Z");
        assert.equal((await db.sparePart.findUniqueOrThrow({ where: { id: part.id } })).stockLocal, 5);
        assert.equal(await db.sparePartHistory.count({ where: { sparePartId: part.id } }), 0);
        await assert.rejects(db.$transaction(tx => recordExternalPurchases(tx, repair.id, user.id, [{ ...purchase, unitCost: "0.20" }])), /otros datos/);
        await assert.rejects(db.$transaction(async tx => {
            await recordExternalPurchases(tx, repair.id, user.id, [{ ...purchase, requestId: randomUUID() }]);
            await consumeRepairParts(tx, { repairId: repair.id, ticketNumber: suffix, actorUserId: user.id, branchId: branch.id, parts: Array.from({ length: 6 }, () => ({ id: part.id })), reason: "prueba rollback" });
        }), /Sin stock/);
        assert.equal(await db.repairExternalPurchase.count({ where: { repairId: repair.id } }), 1);
        assert.equal((await db.sparePart.findUniqueOrThrow({ where: { id: part.id } })).stockLocal, 5);
        await assert.rejects(db.repair.delete({ where: { id: repair.id } }), /Foreign key/);
        await db.$transaction(tx => recordExternalPurchases(tx, repair.id, user.id, [
            { ...purchase, requestId: randomUUID(), supplier: "Proveedor B", quantity: 2, unitCost: "100.50", purchasedAt: "2026-10-02" },
            { ...purchase, requestId: randomUUID(), quantity: 1, unitCost: "1000.00", purchasedAt: "2026-10-03" },
        ]));
        const filters = externalPurchaseFilters({ from: "2026-10-01", to: "2026-10-02" });
        const where = { ...filters.where, repairId: repair.id };
        const summary = await db.repairExternalPurchase.aggregate({ where, _sum: { totalCost: true, quantity: true }, _count: true });
        const suppliers = await db.repairExternalPurchase.groupBy({ by: ["supplier"], where, _sum: { totalCost: true }, orderBy: { _sum: { totalCost: "desc" } } });
        assert.equal(summary._sum.totalCost?.toFixed(2), "201.30");
        assert.equal(summary._sum.quantity, 5);
        assert.equal(summary._count, 2);
        assert.deepEqual(suppliers.map(s => [s.supplier, s._sum.totalCost?.toFixed(2)]), [["Proveedor B", "201.00"], ["Proveedor prueba", "0.30"]]);
        const exactDay = externalPurchaseFilters({ from: "2026-10-02", to: "2026-10-02", q: "Proveedor B" });
        assert.equal(await db.repairExternalPurchase.count({ where: { ...exactDay.where, repairId: repair.id } }), 1);

    } finally {
        await db.repairExternalPurchase.deleteMany({ where: { repairId: repair.id } });
        await db.repair.delete({ where: { id: repair.id } });
        await db.sparePart.delete({ where: { id: part.id } });
        await db.customer.delete({ where: { id: customer.id } });
        await db.user.delete({ where: { id: user.id } });
        await db.branch.delete({ where: { id: branch.id } });
        await db.$disconnect();
    }
});
