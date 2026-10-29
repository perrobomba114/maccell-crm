import { getCurrentUser } from "@/actions/auth-actions";
import { getNotificationsAction } from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers });
        // Always resolve the owner from the current session, never from a cached layout prop.
        return Response.json(await getNotificationsAction(user.id), { headers });
    } catch {
        return Response.json({ error: "No se pudieron actualizar las notificaciones" }, { status: 503, headers });
    }
}
