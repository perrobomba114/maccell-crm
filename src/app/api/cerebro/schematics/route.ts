import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import pdfParse from "pdf-parse";

const MAX_SCHEMATIC_CHARS = 8000;

async function ensureTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS cerebro_schematics (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            device_brand TEXT NOT NULL,
            device_model TEXT NOT NULL,
            filename TEXT NOT NULL,
            extracted_text TEXT NOT NULL,
            uploaded_by TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

export async function GET() {
    try {
        await ensureTable();
        const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, device_brand, device_model, filename, uploaded_by, created_at FROM cerebro_schematics ORDER BY created_at DESC`
        );
        return NextResponse.json(rows);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceBrand, deviceModel, filename, pdfDataUrl, uploadedBy } = body;

        if (!deviceBrand || !deviceModel || !filename || !pdfDataUrl) {
            return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
        }

        const base64 = pdfDataUrl.split(',')[1];
        if (!base64) return NextResponse.json({ error: "PDF inválido." }, { status: 400 });

        const buffer = Buffer.from(base64, 'base64');
        const parsed = await pdfParse(buffer);
        let extractedText = parsed.text?.trim() || '';

        if (!extractedText) {
            return NextResponse.json({ error: "No se pudo extraer texto del PDF." }, { status: 422 });
        }

        if (extractedText.length > MAX_SCHEMATIC_CHARS) {
            extractedText = extractedText.slice(0, MAX_SCHEMATIC_CHARS) + '\n[...truncado...]';
        }

        await ensureTable();
        const result = await prisma.$queryRawUnsafe<any[]>(
            `INSERT INTO cerebro_schematics (id, device_brand, device_model, filename, extracted_text, uploaded_by)
             VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5) RETURNING id`,
            deviceBrand.trim(), deviceModel.trim(), filename.trim(), extractedText, uploadedBy || null
        );

        return NextResponse.json({
            ok: true,
            id: result[0]?.id,
            brand: deviceBrand,
            model: deviceModel,
            chars: extractedText.length
        });
    } catch (err: any) {
        console.error('[SCHEMATICS_POST]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
        await ensureTable();
        await prisma.$executeRawUnsafe(`DELETE FROM cerebro_schematics WHERE id = $1`, id);
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
