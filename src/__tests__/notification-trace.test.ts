import assert from "node:assert/strict";
import test from "node:test";
import { notificationTraceKey, notificationTraceError } from "../lib/notification-trace";

test("trace correlates identifiers without emitting original values", () => {
    const value = "private-account@example.invalid";
    const key = notificationTraceKey(value);
    assert.equal(key, notificationTraceKey(value));
    assert.match(key!, /^[a-f0-9]{20}$/);
    assert.notEqual(key, notificationTraceKey("another-account"));
    assert.equal(notificationTraceKey(undefined), null);
});

test("trace errors exclude messages and arbitrary error codes", () => {
    assert.equal(notificationTraceError({ code: "P2025", message: "private query" }), "P2025");
    assert.equal(notificationTraceError(new Error("private query")), "UNCLASSIFIED");
    assert.equal(notificationTraceError({ code: "private-account@example.invalid" }), "UNCLASSIFIED");
    assert.equal(notificationTraceError(null), "UNCLASSIFIED");
});
