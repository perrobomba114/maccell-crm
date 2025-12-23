
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const spareParts = await db.sparePart.findMany({
            where: {
                deletedAt: null,
            },
            include: {
                category: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return NextResponse.json(spareParts);
    } catch (error) {
        console.error("Error fetching spare parts:", error);
        return NextResponse.json(
            { error: "Error fetching spare parts" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
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
            priceArg // Expecting Client to send calculated ARG price initially
        } = body;

        // Basic Validation
        if (!name || !sku || !brand || !categoryId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check SKU uniqueness
        const existing = await db.sparePart.findUnique({
            where: { sku },
        });

        if (existing) {
            return NextResponse.json(
                { error: "SKU already exists" },
                { status: 400 }
            );
        }

        const sparePart = await db.sparePart.create({
            data: {
                name,
                sku,
                brand,
                categoryId,
                stockLocal: Number(stockLocal) || 0,
                stockDepot: Number(stockDepot) || 0,
                maxStockLocal: Number(maxStockLocal) || 0,
                priceUsd: Number(priceUsd) || 0,
                priceArg: Number(priceArg) || 0,
            },
        });

        return NextResponse.json(sparePart);
    } catch (error) {
        console.error("Error creating spare part:", error);
        return NextResponse.json(
            { error: "Error creating spare part" },
            { status: 500 }
        );
    }
}
