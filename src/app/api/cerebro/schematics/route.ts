import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import pdfParse from "pdf-parse";

const MAX_SCHEMATIC_CHARS = 8000;

// La tabla ya es gestionada por Prisma schema

// ─────────────────────────────────────────────────────────────────────────────
// GET: listar schematics disponibles
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
    try {
        const rows = await prisma.cerebroSchematic.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                deviceBrand: true,
                deviceModel: true,
                filename: true,
                uploadedBy: true,
                createdAt: true
            }
        });
        return NextResponse.json(rows);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: subir un nuevo schematic (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceBrand, deviceModel, filename, pdfDataUrl, uploadedBy } = body;

        if (!deviceBrand || !deviceModel || !filename || !pdfDataUrl) {
            return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
        }

        // Extraer texto del PDF
        const base64 = pdfDataUrl.split(',')[1];
        if (!base64) return NextResponse.json({ error: "PDF inválido." }, { status: 400 });

        const buffer = Buffer.from(base64, 'base64');
        const parsed = await pdfParse(buffer);
        let extractedText = parsed.text?.trim() || '';

        if (!extractedText) {
            return NextResponse.json({ error: "No se pudo extraer texto del PDF." }, { status: 422 });
        }

        // Limitar tamaño para control de contexto
        if (extractedText.length > MAX_SCHEMATIC_CHARS) {
            extractedText = extractedText.slice(0, MAX_SCHEMATIC_CHARS) + '\n[...truncado...]';
        }

        await prisma.cerebroSchematic.create({
            data: {
                deviceBrand: deviceBrand.trim(),
                deviceModel: deviceModel.trim(),
                filename: filename.trim(),
                extractedText: extractedText,
                uploadedBy: uploadedBy || null
            }
        });

        return NextResponse.json({
            ok: true,
            brand: deviceBrand,
            model: deviceModel,
            chars: extractedText.length
        });

    } catch (err: any) {
        console.error('[SCHEMATICS_POST]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: eliminar schematic
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
        await prisma.cerebroSchematic.delete({
            where: { id }
        });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
