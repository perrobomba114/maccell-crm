import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual component's asynchronous refresh callback with deferred I/O.
function bellHarness() {
    const requests: Array<(data: unknown[]) => void> = [];
    const snapshots: unknown[] = [];
    const callbacks: Array<() => Promise<void>> = [];
    let stateIndex = 0;
    let status = 200;
    const errors: unknown[] = [];
    const pending = () => new Promise<unknown[]>(resolve => requests.push(resolve));
    const exports: Record<string, (props: { userId: string }) => unknown> = {};
    const source = fs.readFileSync(new URL("../components/ui/notification-bell.tsx", import.meta.url), "utf8");
    const output = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    vm.runInNewContext(output, {
        exports, console: { ...console, error: () => {} }, AbortController, window: { setTimeout, clearTimeout },
        fetch: async () => ({ ok: status === 200, status, json: pending }),
        require: (name: string) => {
            if (name === "react") return {
                useState: (initial: unknown) => { const index = stateIndex++; return [initial, (v: unknown) => { if (index === 0) snapshots.push(v); if (index === 4) errors.push(v); }]; },
                useRef: (current: unknown) => ({ current }),
                useEffect: () => {},
                useCallback: (fn: () => Promise<void>) => { callbacks.push(fn); return fn; },
            };
            if (name === "react/jsx-runtime") return { jsx: () => null, jsxs: () => null };
            if (name === "next/navigation") return { useRouter: () => ({ push: () => {} }) };
            if (name === "@/lib/actions/notifications") return { getNotificationsAction: pending };
            if (name === "@/hooks/use-polling") return { usePolling: () => {} };
            return {};
        },
    });
    exports.NotificationBell({ userId: "test-account" });
    return { refresh: callbacks[0], requests, snapshots, errors, setStatus: (value: number) => { status = value; } };
}

test("slow refresh is applied even when more polling ticks arrive", async () => {
    const h = bellHarness();
    const first = h.refresh();
    await new Promise<void>(resolve => setImmediate(resolve));
    const second = h.refresh();
    const third = h.refresh();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(h.requests.length, 1, "polling must not enqueue requests that invalidate the outstanding response");
    h.requests[0]([]);
    await Promise.all([first, second, third]);
    assert.equal(h.snapshots.length, 1);
    assert.equal((h.snapshots[0] as unknown[]).length, 0, "empty server list must clear the other device's stale notifications");
    const next = h.refresh();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(h.requests.length, 2, "polling must resume after completion");
    h.requests[1]([]);
    await next;
});


test("failed synchronization is visible and does not block the next refresh", async () => {
    const h = bellHarness();
    h.setStatus(503);
    await h.refresh();
    assert.equal(h.snapshots.length, 0, "failure must not masquerade as an empty server list");
    assert.equal(h.errors.at(-1), true);
    h.setStatus(200);
    const retry = h.refresh();
    await new Promise<void>(resolve => setImmediate(resolve));
    h.requests[0]([]);
    await retry;
    assert.equal(h.errors.at(-1), false);
    assert.equal(h.snapshots.length, 1);
});
