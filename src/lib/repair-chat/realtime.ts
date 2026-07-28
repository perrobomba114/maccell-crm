import { EventEmitter } from "node:events";
import pg from "pg";
import { z } from "zod";

const CHANNEL = "repair_chat_events";

export const repairChatEventSchema = z.object({
    eventId: z.string().uuid(),
    type: z.enum(["message.created", "chat.read", "access.changed", "status.changed"]),
    repairId: z.string().min(1).max(80),
    branchId: z.string().min(1).max(80),
    assignedUserId: z.string().min(1).max(80).nullable(),
    occurredAt: z.string().datetime(),
}).strict();

export type RepairChatEvent = z.infer<typeof repairChatEventSchema>;
type RepairChatEventListener = (event: RepairChatEvent) => void;

declare global {
    var repairChatEmitter: EventEmitter | undefined;
    var repairChatListenerPromise: Promise<pg.Client> | undefined;
    var repairChatPublisherPool: pg.Pool | undefined;
}

const emitter = globalThis.repairChatEmitter ?? new EventEmitter();
globalThis.repairChatEmitter = emitter;

function connectionString(): string {
    return process.env.DATABASE_URL ?? "postgresql://dummy:dummy@localhost:5432/dummy";
}

export async function ensureRepairChatListener(): Promise<pg.Client> {
    if (globalThis.repairChatListenerPromise) return globalThis.repairChatListenerPromise;
    const client = new pg.Client({ connectionString: connectionString() });
    globalThis.repairChatListenerPromise = (async () => {
        await client.connect();
        await client.query(`LISTEN ${CHANNEL}`);
        client.on("notification", (notification) => {
            if (!notification.payload) return;
            const parsed = repairChatEventSchema.safeParse(JSON.parse(notification.payload));
            if (parsed.success) emitter.emit(CHANNEL, parsed.data);
        });
        client.on("error", (error: Error) => {
            console.warn("[REPAIR_CHAT] PostgreSQL listener disconnected:", error.message);
            globalThis.repairChatListenerPromise = undefined;
        });
        return client;
    })();
    return globalThis.repairChatListenerPromise;
}

export async function publishRepairChatEvent(event: RepairChatEvent): Promise<void> {
    const validated = repairChatEventSchema.parse(event);
    const pool = globalThis.repairChatPublisherPool ?? new pg.Pool({ connectionString: connectionString(), max: 2 });
    globalThis.repairChatPublisherPool = pool;
    await pool.query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify(validated)]);
}

export function subscribeToRepairChatEvents(listener: RepairChatEventListener): () => void {
    emitter.on(CHANNEL, listener);
    return () => emitter.off(CHANNEL, listener);
}
