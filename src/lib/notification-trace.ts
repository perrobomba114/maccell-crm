import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";

// Short pseudonyms allow correlation without logging identifiers or message contents.
export function notificationTraceKey(value: string | null | undefined) {
    return value ? createHash("sha256").update(value).digest("hex").slice(0, 20) : null;
}

export async function startNotificationTrace(operation: "list" | "read" | "clear", target?: string) {
    const started = Date.now();
    const requestId = randomUUID();
    const [requestHeaders, jar] = await Promise.all([headers(), cookies()]);
    const agent = requestHeaders.get("user-agent") ?? "";
    const context = {
        requestId,
        operation,
        actor: notificationTraceKey(jar.get("session_user_id")?.value),
        target: notificationTraceKey(target),
        device: /Mobile|Android|iPhone|iPad/i.test(agent) ? "mobile" : "desktop",
        instance: notificationTraceKey(process.env.HOSTNAME),
    };
    return (phase: "start" | "result" | "persisted" | "error", details: Record<string, unknown> = {}) => {
        console.info("[notification-trace]", JSON.stringify({
            ...context, phase, at: new Date().toISOString(), elapsedMs: Date.now() - started, ...details,
        }));
    };
}

export function notificationTraceError(error: unknown) {
    // Never emit error messages: database errors can contain query parameters.
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    return typeof code === "string" && /^(P\d{4}|[0-9A-Z]{5})$/.test(code) ? code : "UNCLASSIFIED";
}
