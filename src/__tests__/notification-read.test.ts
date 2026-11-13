import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("lectura individual y masiva: solo el destinatario autenticado puede marcar sus avisos", async () => {
    const rows = [
        { id: "uno", userId: "a", isRead: false, status: "PENDING" },
        { id: "dos", userId: "a", isRead: false, status: null },
        { id: "otro", userId: "b", isRead: false, status: null },
    ];
    let user: { id: string } | null = null;
    const modules: Record<string, unknown> = {
        "@/actions/auth-actions": { getCurrentUser: async () => user },
        "@/lib/db": { db: { notification: {
            updateMany: async ({ where, data }: { where: Record<string, unknown>; data: object }) => {
                const matched = rows.filter(row => Object.entries(where).every(([k, v]) => row[k as keyof typeof row] === v));
                matched.forEach(row => Object.assign(row, data));
                return { count: matched.length };
            },
        } } },
        "next/cache": { revalidatePath: () => {} },
        "@/lib/notification-trace": { startNotificationTrace: async () => () => {}, notificationTraceKey: () => null },
    };
    const actions = {} as typeof import("../lib/actions/notifications");
    const source = fs.readFileSync(new URL("../lib/actions/notifications.ts", import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    vm.runInNewContext(outputText, { exports: actions, require: (key: string) => modules[key] ?? {} });

    assert.equal((await actions.markAllNotificationsReadAction()).success, false);
    assert.equal((await actions.markNotificationReadAction("uno")).success, false);
    user = { id: "a" };
    assert.equal((await actions.markNotificationReadAction("otro")).success, false);
    assert.equal((await actions.markNotificationReadAction("uno")).success, true);
    assert.equal((await actions.markNotificationReadAction("uno")).success, true);
    assert.deepEqual(rows.map(row => row.isRead), [true, false, false]);
    assert.equal((await actions.markAllNotificationsReadAction()).success, true);
    assert.deepEqual(rows.map(row => row.isRead), [true, true, false]);
    assert.equal(rows[0].status, "PENDING");
});
