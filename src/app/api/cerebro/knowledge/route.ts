import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/local-embeddings";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indexa un artículo de wiki en repair_embeddings con source='wiki'.
 * Los artículos de wiki tienen MAYOR PESO en el RAG que las reparaciones crudas.
 * Fire-and-forget — no bloquea la respuesta al técnico.
 */
async function indexWikiInRAG(knowledge: {
    id: string;
    title: string;
    content: string;
    deviceBrand: string;
    deviceModel: string;
}): Promise<void> {
    try {
        // Documento rico: título + contenido completo (wiki tiene más contexto que raw repair)
        const document = `[WIKI] ${knowledge.title}\n${knowledge.deviceBrand} ${knowledge.deviceModel}\n\n${knowledge.content}`;
        const embedding = await generateEmbedding(document);
        if (!embedding) {
            console.warn('[KNOWLEDGE_INDEX] ⚠️ No se pudo generar embedding para wiki:', knowledge.id);
            return;
        }

        const vectorStr = `[${embedding.join(',')}]`;

        // Usamos repairId = "wiki_<id>" para no colisionar con reparaciones reales
        await prisma.$executeRawUnsafe(`
            INSERT INTO repair_embeddings
                (id, "repairId", "ticketNumber", "deviceBrand", "deviceModel", "contentText", embedding, "createdAt", "updatedAt")
            VALUES
                (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, now(), now())
            ON CONFLICT ("repairId") DO UPDATE SET
                "contentText" = EXCLUDED."contentText",
                embedding     = EXCLUDED.embedding,
                "updatedAt"   = now()
        `,
            `wiki_${knowledge.id}`,
            `WIKI: ${knowledge.title.slice(0, 60)}`,
            knowledge.deviceBrand,
            knowledge.deviceModel,
            document,
            vectorStr
        );

        console.log(`[KNOWLEDGE_INDEX] ✅ Wiki indexada en RAG: "${knowledge.title.slice(0, 50)}"`);
    } catch (err: any) {
        // No interrumpir el flujo principal
        console.warn('[KNOWLEDGE_INDEX] ⚠️ Error indexando wiki en RAG:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Buscar soluciones en la base de conocimiento
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const brand = searchParams.get("brand") || "";
        const model = searchParams.get("model") || "";

        const where: any = {};

        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
                { problemTags: { hasSome: [query] } }
            ];
        }

        if (brand) where.deviceBrand = { contains: brand, mode: 'insensitive' };
        if (model) where.deviceModel = { contains: model, mode: 'insensitive' };

        const results = await (prisma as any).repairKnowledge.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json(results);
    } catch (error: any) {
        console.error("[KNOWLEDGE_GET] Error:", error);
        return NextResponse.json({ error: "Error al buscar soluciones." }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Crear una nueva solución técnica → también indexar en RAG
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, content, deviceBrand, deviceModel, problemTags, authorId, mediaUrls } = body;

        if (!title || !content || !authorId) {
            return NextResponse.json({ error: "Información incompleta." }, { status: 400 });
        }

        const newKnowledge = await (prisma as any).repairKnowledge.create({
            data: {
                title,
                content,
                deviceBrand: deviceBrand || "Genérico",
                deviceModel: deviceModel || "Genérico",
                problemTags: problemTags || [],
                authorId,
                mediaUrls: mediaUrls || []
            }
        });

        // 🧠 Indexar en RAG (background, no bloquea la respuesta)
        indexWikiInRAG(newKnowledge).catch(() => { });

        return NextResponse.json(newKnowledge);
    } catch (error: any) {
        console.error("[KNOWLEDGE_POST] Error:", error);
        return NextResponse.json({ error: "Error al guardar solución." }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Actualizar solución → re-indexar en RAG con contenido nuevo
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, title, content, deviceBrand, deviceModel, problemTags, authorId, mediaUrls } = body;

        if (!id || !title || !content) {
            return NextResponse.json({ error: "Información incompleta." }, { status: 400 });
        }

        const dataToUpdate: any = {
            title,
            content,
            deviceBrand: deviceBrand || undefined,
            deviceModel: deviceModel || undefined,
            problemTags: problemTags || undefined,
            authorId: authorId || undefined,
        };

        if (mediaUrls !== undefined) {
            dataToUpdate.mediaUrls = mediaUrls;
        }

        const updated = await (prisma as any).repairKnowledge.update({
            where: { id },
            data: dataToUpdate
        });

        // 🧠 Re-indexar con contenido actualizado (background)
        indexWikiInRAG(updated).catch(() => { });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("[KNOWLEDGE_PATCH] Error:", error);
        return NextResponse.json({ error: "Error al actualizar solución." }, { status: 500 });
    }
}
