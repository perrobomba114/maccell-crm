import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { OLLAMA_MODELS, ENRICH_DIAGNOSIS_SYSTEM_PROMPT, CRON_MAX_TICKETS } from "@/config/ai-models";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL;

export async function GET(req: NextRequest) {
    // Verificar auth (opcional para cron interno, pero bueno tener un secreto)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return new Response('Unauthorized', { status: 401 });
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

        const ollama = createOpenAI({
            baseURL: OLLAMA_URL ? `${OLLAMA_URL}/v1` : undefined,
            apiKey: "ollama",
        });

        let enrichedCount = 0;

        for (const repair of repairs) {
            try {
                const { text } = await generateText({
                    model: ollama(OLLAMA_MODELS.ENHANCER),
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
            enriched: enrichedCount
        });

    } catch (error: any) {
        console.error("[CRON_ENRICH] Error:", error);
        return NextResponse.json({ error: "Error en el proceso de enriquecimiento." }, { status: 500 });
    }
}
