import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { checkCerebroHealth } from "@/lib/cerebro-v2/health";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
    const user = await getCurrentUser();
    if (!user || !canUseCerebroV2(user.role)) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const health = await checkCerebroHealth();
    return Response.json(health, { status: health.overall === "healthy" ? 200 : 503 });
}
