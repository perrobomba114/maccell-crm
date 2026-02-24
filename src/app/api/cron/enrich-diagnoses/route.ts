import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { AI_MODELS, ENRICH_DIAGNOSIS_SYSTEM_PROMPT, CRON_MAX_TICKETS } from "@/config/ai-models";

export async function GET(req: NextRequest) {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // 1. Buscar reparaciones finalizadas que no tengan diagnóstico enriquecido
        const repairs = await (prisma.repair as any).findMany({
            where: {
                diagnosis: { not: null },
                diagnosisEnriched: null,
                statusId: { in: [4, 5] } // Asumiendo que 4=Listo y 5=Entregado
            },
            take: CRON_MAX_TICKETS,
            orderBy: { createdAt: 'desc' }
        });

        if (repairs.length === 0) {
            return NextResponse.json({ message: "No hay diagnósticos para enriquecer." });
        }

        const openrouter = createOpenRouter({
            apiKey: process.env.OPENROUTER_API_KEY || "",
            headers: {
                "HTTP-Referer": "https://sistema.maccell.com.ar",
                "X-Title": "Maccell CRM Cron",
            }
        });

        let enrichedCount = 0;

        for (const repair of repairs) {
            try {
                const { text } = await generateText({
                    model: openrouter(AI_MODELS.CHAT),
                    system: ENRICH_DIAGNOSIS_SYSTEM_PROMPT,
                    prompt: `Diagnóstico original del técnico: "${repair.diagnosis}"\nDispositivo: ${repair.deviceBrand} ${repair.deviceModel}`,
                    temperature: 0.2,
                });

                if (text) {
                    await (prisma.repair as any).update({
                        where: { id: repair.id },
                        data: { diagnosisEnriched: text.trim() }
                    });
                    enrichedCount++;
                }
            } catch (err) {
                console.error(`Error enriqueciendo reparación ${repair.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            processed: repairs.length,
            enriched: enrichedCount,
            model: AI_MODELS.CHAT
        });

    } catch (error: any) {
        console.error("[CRON_ENRICH] Error:", error);
        return NextResponse.json({ error: "Error en el proceso de enriquecimiento." }, { status: 500 });
    }
}
