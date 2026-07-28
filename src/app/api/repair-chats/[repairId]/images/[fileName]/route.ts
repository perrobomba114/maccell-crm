import fs from "node:fs/promises";
import { getCurrentUser } from "@/actions/auth-actions";
import { repairChatImagePath } from "@/lib/repair-chat/media";
import { getAuthorizedRepair } from "@/lib/repair-chat/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ repairId: string; fileName: string }> }): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const { repairId, fileName } = await params;
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        if (!await getAuthorizedRepair(user, repairId)) return Response.json({ error: "Sin acceso" }, { status: 403 });
        const filePath = repairChatImagePath(repairId, fileName);
        if (!filePath) return Response.json({ error: "Archivo inválido" }, { status: 400 });
        const content = await fs.readFile(filePath);
        return new Response(content, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
    } catch (error: unknown) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return Response.json({ error: "No encontrado" }, { status: 404 });
        console.error("[repair-chats/images] GET failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo cargar la imagen" }, { status: 503 });
    }
}
