import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("groups repeated repair part requests into one stock movement", async () => {
    let groupRepairPartRequests: typeof import("../lib/repairs/consume-repair-parts").groupRepairPartRequests;
    try {
        ({ groupRepairPartRequests } = await import("../lib/repairs/consume-repair-parts"));
    } catch {
        assert.fail("Falta el planificador central de consumo de repuestos");
    }

    assert.deepEqual(
        groupRepairPartRequests([{ id: "part-a" }, { id: "part-b" }, { id: "part-a" }]),
        [{ id: "part-a", quantity: 2 }, { id: "part-b", quantity: 1 }],
    );
});

test("consumes stock conditionally and records repair and branch history atomically", async () => {
    let consumeRepairParts: typeof import("../lib/repairs/consume-repair-parts").consumeRepairParts;
    try {
        ({ consumeRepairParts } = await import("../lib/repairs/consume-repair-parts"));
    } catch {
        assert.fail("Falta el consumo atómico de repuestos");
    }

    const stockUpdates: Array<Record<string, unknown>> = [];
    const repairParts: Array<Record<string, unknown>> = [];
    const history: Array<Record<string, unknown>> = [];
    const transaction = {
        sparePart: {
            findMany: async () => [{ id: "part-a", name: "Pantalla A" }],
            updateMany: async (args: Record<string, unknown>) => {
                stockUpdates.push(args);
                return { count: 1 };
            },
        },
        repairPart: {
            create: async (args: Record<string, unknown>) => {
                repairParts.push(args);
                return args;
            },
        },
        sparePartHistory: {
            create: async (args: Record<string, unknown>) => {
                history.push(args);
                return args;
            },
        },
    };

    const names = await consumeRepairParts(transaction, {
        repairId: "repair-1",
        ticketNumber: "MAC2-1",
        actorUserId: "tech-1",
        branchId: "branch-2",
        parts: [{ id: "part-a" }, { id: "part-a" }],
        reason: "Asignación técnica",
    });

    assert.deepEqual(names, ["Pantalla A"]);
    assert.deepEqual(stockUpdates[0], {
        where: { id: "part-a", deletedAt: null, stockLocal: { gte: 2 } },
        data: { stockLocal: { decrement: 2 } },
    });
    assert.deepEqual(repairParts[0], {
        data: { repairId: "repair-1", sparePartId: "part-a", quantity: 2 },
    });
    assert.deepEqual(history[0], {
        data: {
            sparePartId: "part-a",
            userId: "tech-1",
            branchId: "branch-2",
            quantity: -2,
            reason: "Reparación #MAC2-1 (Asignación técnica)",
            isChecked: false,
        },
    });
});

test("every repair assignment path uses the central stock consumer", () => {
    const files = [
        "../actions/repairs/take.ts",
        "../actions/repairs/tech-assign.ts",
        "../actions/repairs/tech-parts.ts",
        "../actions/repairs/update.ts",
    ];

    for (const file of files) {
        const source = readFileSync(new URL(file, import.meta.url), "utf8");
        assert.match(source, /consumeRepairParts/);
    }
});

test("repair editing requires an administrator before mutating repair parts", () => {
    const source = readFileSync(new URL("../actions/repairs/update.ts", import.meta.url), "utf8");
    assert.match(source, /getCurrentUser\(\)[\s\S]*?currentUser\.role !== "ADMIN"[\s\S]*?No autorizado/);
});

test("manual repair part assignment authenticates the assigned technician first", () => {
    const source = readFileSync(new URL("../actions/repairs/tech-parts.ts", import.meta.url), "utf8");
    assert.match(source, /addPartToRepairAction[\s\S]*?getCurrentUser\(\)[\s\S]*?currentUser\.role !== "TECHNICIAN"[\s\S]*?currentUser\.id !== technicianId/);
});

test("single part returns authenticate the assigned technician first", () => {
    const source = readFileSync(new URL("../actions/repairs/tech-parts.ts", import.meta.url), "utf8");
    assert.match(source, /createSinglePartReturnAction[\s\S]*?getCurrentUser\(\)[\s\S]*?currentUser\.role !== "TECHNICIAN"[\s\S]*?currentUser\.id !== technicianId/);
});

test("a successful spare-part scan closes the camera immediately", () => {
    const selector = readFileSync(new URL("../components/repairs/spare-part-selector.tsx", import.meta.url), "utf8");
    const scanner = readFileSync(new URL("../components/ui/barcode-scanner.tsx", import.meta.url), "utf8");
    const handlerStart = selector.indexOf("const handleScannedPart");
    const handlerEnd = selector.indexOf("return (", handlerStart);
    const scannedPartHandler = selector.slice(handlerStart, handlerEnd);

    assert.doesNotMatch(scannedPartHandler, /shouldContinueRepairPartScanning/);
    assert.doesNotMatch(scannedPartHandler, /Escaneá otro repuesto/);
    assert.match(scannedPartHandler, /toast\.success[\s\S]*setShowScanner\(false\)[\s\S]*return true/);
    assert.doesNotMatch(scanner, /setTimeout\(startScanner/);
});

test("takeover dialog state is isolated by repair and unmounted after closing", () => {
    const table = readFileSync(new URL("../components/repairs/active-repairs-table.tsx", import.meta.url), "utf8");

    assert.match(
        table,
        /\{takeoverRepair && <TakeRepairDialog key=\{takeoverRepair\.id\}/,
    );
});

test("camera permission focus changes cannot dismiss the mobile scanner", async () => {
    let keepScannerOpenOnImplicitDialogChange: typeof import("../lib/repairs/repair-part-scanner").keepScannerOpenOnImplicitDialogChange;
    try {
        ({ keepScannerOpenOnImplicitDialogChange } = await import("../lib/repairs/repair-part-scanner"));
    } catch {
        assert.fail("Falta proteger el escáner contra cierres implícitos durante el permiso de cámara");
    }

    assert.equal(keepScannerOpenOnImplicitDialogChange(true, false), true);
    assert.equal(keepScannerOpenOnImplicitDialogChange(false, true), true);
    assert.equal(keepScannerOpenOnImplicitDialogChange(false, false), false);

    const selector = readFileSync(new URL("../components/repairs/spare-part-selector.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(selector, /onOpenChange=\{setShowScanner\}/);
    assert.match(selector, /keepScannerOpenOnImplicitDialogChange/);
});
