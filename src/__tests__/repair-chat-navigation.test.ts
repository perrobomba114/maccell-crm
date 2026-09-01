import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRepairDetailsHref, removeRepairDetailsParam } from "../lib/repair-chat/navigation";

const readComponent = (name: string) => readFileSync(new URL(`../components/${name}`, import.meta.url), "utf8");

test("builds the repair detail destination for every chat role", () => {
    const activeRepair = { id: "repair-active", statusId: 4 };
    const finishedRepair = { id: "repair-finished", statusId: 5 };
    const deliveredRepair = { id: "repair-delivered", statusId: 6 };
    const invoicedRepair = { id: "repair-invoiced", statusId: 10 };
    const waitingConfirmationRepair = { id: "repair-confirmation", statusId: 8 };
    const waitingPartsRepair = { id: "repair-parts", statusId: 9 };

    assert.equal(buildRepairDetailsHref("ADMIN", activeRepair), "/admin/repairs?repairId=repair-active");
    assert.equal(buildRepairDetailsHref("VENDOR", activeRepair), "/vendor/repairs/active?repairId=repair-active");
    assert.equal(buildRepairDetailsHref("VENDOR", finishedRepair), "/vendor/repairs/history?repairId=repair-finished");
    assert.equal(buildRepairDetailsHref("VENDOR", deliveredRepair), "/vendor/repairs/history?repairId=repair-delivered");
    assert.equal(buildRepairDetailsHref("VENDOR", invoicedRepair), "/vendor/repairs/history?repairId=repair-invoiced");
    assert.equal(buildRepairDetailsHref("VENDOR", waitingConfirmationRepair), "/vendor/repairs/history?repairId=repair-confirmation");
    assert.equal(buildRepairDetailsHref("VENDOR", waitingPartsRepair), "/vendor/repairs/history?repairId=repair-parts");
    assert.equal(buildRepairDetailsHref("TECHNICIAN", activeRepair), "/technician/repairs?repairId=repair-active");
    assert.equal(buildRepairDetailsHref("TECHNICIAN", finishedRepair), "/technician/history?repairId=repair-finished");
    assert.equal(buildRepairDetailsHref("TECHNICIAN", deliveredRepair), "/technician/history?repairId=repair-delivered");
    assert.equal(buildRepairDetailsHref("TECHNICIAN", waitingConfirmationRepair), "/technician/history?repairId=repair-confirmation");
    assert.equal(buildRepairDetailsHref("TECHNICIAN", waitingPartsRepair), "/technician/history?repairId=repair-parts");
});

test("removes only the repair detail parameter when closing the dialog", () => {
    assert.equal(
        removeRepairDetailsParam("/vendor/repairs/history", new URLSearchParams("q=samsung&page=2&repairId=repair-final")),
        "/vendor/repairs/history?q=samsung&page=2",
    );
    assert.equal(removeRepairDetailsParam("/technician/repairs", new URLSearchParams("repairId=repair-active")), "/technician/repairs");
});

test("chat ticket closes the widget and navigates to the repair details", () => {
    const thread = readComponent("repair-chat/repair-chat-thread.tsx");
    assert.match(thread, /buildRepairDetailsHref/);
    assert.match(thread, /chat\.setOpen\(false\)/);
    assert.match(thread, /router\.push\(href\)/);
    assert.match(thread, /aria-label={`Abrir detalles de la reparación/);
});

test("repair pages consume repairId and open their detail dialog", () => {
    for (const file of ["repairs/admin-repairs-table.tsx", "repairs/active-repairs-table.tsx", "repairs/history-repairs-table.tsx"]) {
        const source = readComponent(file);
        assert.match(source, /searchParams\.get\(["']repairId["']\)/, file);
        assert.match(source, /removeRepairDetailsParam/, file);
    }
});

test("chat inbox constrains active rows and labels on narrow screens", () => {
    const inbox = readComponent("repair-chat/repair-chat-inbox.tsx");
    assert.match(inbox, /overflow-hidden/);
    assert.match(inbox, /max-w-\[45%\]/);
    assert.match(inbox, /min-w-0/);
});
