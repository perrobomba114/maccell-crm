import { getCurrentUser } from "@/actions/auth-actions";
import { saveRepairChatImage } from "@/lib/repair-chat/media";
import { getAuthorizedRepair } from "@/lib/repair-chat/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ repairId: string }> }): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const { repairId } = await params;
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        if (!await getAuthorizedRepair(user, repairId)) return Response.json({ error: "Sin acceso" }, { status: 403 });
        const formData = await request.formData();
        const files = formData.getAll("images").filter((value): value is File => value instanceof File).slice(0, 4);
        if (files.length === 0) return Response.json({ error: "Seleccioná una imagen" }, { status: 400 });
        const imageUrls: string[] = [];
        for (const file of files) imageUrls.push(await saveRepairChatImage(repairId, file));
        return Response.json({ imageUrls }, { status: 201 });
    } catch (error: unknown) {
        console.error("[repair-chats/images] POST failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar la imagen" }, { status: 400 });
    }
}
