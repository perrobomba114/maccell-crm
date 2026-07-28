import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/actions/auth-actions";
import { ensureRepairChatListener, subscribeToRepairChatEvents } from "@/lib/repair-chat/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
    await ensureRepairChatListener();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ connectionId: randomUUID() })}\nretry: 3000\n\n`));
            const unsubscribe = subscribeToRepairChatEvents((event) => {
                const allowed = user.role === "ADMIN"
                    || (user.role === "VENDOR" && user.branch?.id === event.branchId)
                    || (user.role === "TECHNICIAN" && user.id === event.assignedUserId);
                if (allowed) controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
            });
            request.signal.addEventListener("abort", () => {
                unsubscribe();
                controller.close();
            }, { once: true });
        },
    });
    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
