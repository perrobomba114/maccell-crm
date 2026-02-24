import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

// GET: Buscar soluciones en la base de conocimiento
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

// POST: Crear una nueva solución técnica
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

        return NextResponse.json(newKnowledge);
    } catch (error: any) {
        console.error("[KNOWLEDGE_POST] Error:", error);
        return NextResponse.json({ error: "Error al guardar solución." }, { status: 500 });
    }
}

// PATCH: Actualizar una solución existente
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

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("[KNOWLEDGE_PATCH] Error:", error);
        return NextResponse.json({ error: "Error al actualizar solución." }, { status: 500 });
    }
}
