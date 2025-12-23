
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const {
            name,
            sku,
            brand,
            categoryId,
            stockLocal,
            stockDepot,
            maxStockLocal,
            priceUsd,
            priceArg,
        } = body;

        // Check if exists
        const existing = await db.sparePart.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Spare part not found" },
                { status: 404 }
            );
        }

        // Check SKU if changed
        if (sku && sku !== existing.sku) {
            const skuCheck = await db.sparePart.findUnique({
                where: { sku }
            });
            if (skuCheck) {
                return NextResponse.json({ error: "SKU already in use" }, { status: 400 });
            }
        }

        const updated = await db.sparePart.update({
            where: { id },
            data: {
                name,
                sku,
                brand,
                categoryId,
                stockLocal: stockLocal !== undefined ? Number(stockLocal) : undefined,
                stockDepot: stockDepot !== undefined ? Number(stockDepot) : undefined,
                maxStockLocal: maxStockLocal !== undefined ? Number(maxStockLocal) : undefined,
                priceUsd: priceUsd !== undefined ? Number(priceUsd) : undefined,
                priceArg: priceArg !== undefined ? Number(priceArg) : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating spare part:", error);
        return NextResponse.json(
            { error: "Error updating spare part" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Soft DELETE
        await db.sparePart.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting spare part:", error);
        return NextResponse.json(
            { error: "Error deleting spare part" },
            { status: 500 }
        );
    }
}
