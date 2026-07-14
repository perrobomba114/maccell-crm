import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { listAuthorizedCerebroRepairs, toCerebroRepairSummary } from "@/lib/cerebro-v2/repair-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) {
            return Response.json({ error: "Sin acceso" }, { status: 403 });
        }
        const search = new URL(request.url).searchParams.get("q")?.slice(0, 120) ?? "";
        const repairs = (await listAuthorizedCerebroRepairs(user, search)).map(toCerebroRepairSummary);
        return Response.json({ repairs });
    } catch (error) {
        console.error(
            "[cerebro-v2/repairs] Error:",
            error instanceof Error ? error.message : "unknown error",
        );
        return Response.json({ error: "No se pudieron cargar las reparaciones" }, { status: 503 });
    }
}
