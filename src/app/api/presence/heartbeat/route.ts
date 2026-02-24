import { db as prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

/**
 * MACCELL Presence Heartbeat
 * El cliente llama este endpoint cada 3 minutos mientras tenga la app abierta.
 * Actualiza lastActiveAt en la DB para reflejar presencia real.
 */
export async function POST() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_user_id")?.value;

        if (!userId) {
            return Response.json({ ok: false }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                isOnline: true,
                lastActiveAt: new Date()
            }
        });

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
