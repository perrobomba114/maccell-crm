import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { queryRag } from "@/lib/cerebro-v2/rag-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
    responseId: z.string().uuid(),
    chunkId: z.string().uuid(),
    helpful: z.boolean(),
});

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
        const parsed = feedbackSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Feedback inválido" }, { status: 400 });
        await queryRag(
            `INSERT INTO rag_feedback (user_id, response_id, chunk_id, helpful)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, response_id, chunk_id)
             DO UPDATE SET helpful = EXCLUDED.helpful, created_at = now()`,
            [user.id, parsed.data.responseId, parsed.data.chunkId, parsed.data.helpful],
        );
        return Response.json({ ok: true });
    } catch (error) {
        console.error("[cerebro-v2/feedback] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo guardar el feedback" }, { status: 500 });
    }
}
