import assert from "node:assert/strict";
import test from "node:test";

import {
    buildNotificationCenterPage,
    getNotificationActionConfig,
    normalizeNotificationStatusFilter,
} from "../lib/notification-center";

const branches = [
    { id: "branch-8bit", name: "8 BIT ACCESORIOS", code: "8BIT", ticketPrefix: "8BIT" },
    { id: "branch-m2", name: "MACCELL 2", code: "M2", ticketPrefix: "MAC2" },
];

test("defaults notification center to pending requests so resolved header items do not crowd the queue", () => {
    const page = buildNotificationCenterPage([
        {
            id: "pending-1",
            title: "Nueva Devolución de Repuestos",
            message: "Alejandro solicitó devolver repuestos de la reparación #8BIT-00000207.",
            type: "ACTION_REQUEST",
            status: "PENDING",
            actionData: null,
            link: "/admin/returns",
            createdAt: new Date("2026-07-04T12:00:00Z"),
        },
        {
            id: "accepted-1",
            title: "Discrepancia resuelta",
            message: "Resuelta",
            type: "ACTION_REQUEST",
            status: "ACCEPTED",
            actionData: { type: "STOCK_DISCREPANCY", branchName: "MACCELL 2" },
            link: "/admin/notifications",
            createdAt: new Date("2026-07-04T11:00:00Z"),
        },
    ], {
        branches,
        branchId: "ALL",
        page: 1,
        limit: 25,
    });

    assert.equal(normalizeNotificationStatusFilter(undefined), "PENDING");
    assert.deepEqual(page.notifications.map((notification) => notification.id), ["pending-1"]);
    assert.equal(page.counts.total, 2);
    assert.equal(page.counts.pending, 1);
    assert.equal(page.counts.accepted, 1);
});

test("filters notifications by branch derived from action data, ticket prefix and related sale", () => {
    const page = buildNotificationCenterPage([
        {
            id: "return-8bit",
            title: "Nueva Devolución de Repuestos",
            message: "Solicitud de la reparación #8BIT-00000207.",
            type: "ACTION_REQUEST",
            status: "PENDING",
            actionData: null,
            link: "/admin/returns",
            createdAt: new Date("2026-07-04T12:00:00Z"),
        },
        {
            id: "stock-m2",
            title: "Discrepancia de Stock",
            message: "Stock MACCELL 2",
            type: "ACTION_REQUEST",
            status: "PENDING",
            actionData: { type: "STOCK_DISCREPANCY", branchName: "MACCELL 2" },
            link: "/admin/notifications",
            createdAt: new Date("2026-07-04T11:00:00Z"),
        },
        {
            id: "sale-8bit",
            title: "Cambio de Precio Detectado",
            message: "Venta #SALE-1783177240786-937",
            type: "WARNING",
            status: null,
            actionData: null,
            link: "/admin/sales?search=SALE-1783177240786-937",
            createdAt: new Date("2026-07-04T10:00:00Z"),
        },
    ], {
        branches,
        branchId: "branch-8bit",
        status: "ALL",
        page: 1,
        limit: 25,
        relatedSaleBranches: {
            "SALE-1783177240786-937": branches[0],
        },
    });

    assert.deepEqual(page.notifications.map((notification) => notification.id), ["return-8bit", "sale-8bit"]);
    assert.deepEqual(page.notifications.map((notification) => notification.branch?.name), ["8 BIT ACCESORIOS", "8 BIT ACCESORIOS"]);
});

test("paginates after branch filtering", () => {
    const notifications = Array.from({ length: 3 }).map((_, index) => ({
        id: `m2-${index + 1}`,
        title: "Discrepancia",
        message: "Stock",
        type: "ACTION_REQUEST",
        status: "PENDING",
        actionData: { type: "STOCK_DISCREPANCY", branchName: "MACCELL 2" },
        link: "/admin/notifications",
        createdAt: new Date(`2026-07-04T1${index}:00:00Z`),
    }));

    const page = buildNotificationCenterPage(notifications, {
        branches,
        branchId: "branch-m2",
        page: 2,
        limit: 2,
    });

    assert.equal(page.total, 3);
    assert.equal(page.totalPages, 2);
    assert.equal(page.from, 3);
    assert.equal(page.to, 3);
    assert.deepEqual(page.notifications.map((notification) => notification.id), ["m2-3"]);
});

test("uses clear action labels for actionable notification types", () => {
    assert.deepEqual(getNotificationActionConfig({
        type: "ACTION_REQUEST",
        actionData: { type: "STOCK_DISCREPANCY" },
        link: "/admin/notifications",
    }), {
        mode: "respond",
        acceptLabel: "Aceptar ajuste",
        rejectLabel: "Rechazar ajuste",
    });

    assert.deepEqual(getNotificationActionConfig({
        type: "ACTION_REQUEST",
        actionData: { type: "RETURN_REQUEST" },
        link: "/admin/returns",
    }), {
        mode: "link",
        linkLabel: "Abrir devoluciones",
        href: "/admin/returns",
    });
});
