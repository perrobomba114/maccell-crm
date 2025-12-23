
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { rate } = body;

        if (!rate || isNaN(rate)) {
            return NextResponse.json(
                { error: "Invalid rate" },
                { status: 400 }
            );
        }

        // Use raw query for performance and atomic update
        // Assuming table name "spare_parts" and column names "priceUsd", "priceArg" match Prisma 1:1
        const result = await db.$executeRaw`
      UPDATE "spare_parts"
      SET "priceArg" = "priceUsd" * ${rate}
      WHERE "deletedAt" IS NULL
    `;

        return NextResponse.json({ success: true, count: result });
    } catch (error) {
        console.error("Error updating prices:", error);
        return NextResponse.json(
            { error: "Error updating prices" },
            { status: 500 }
        );
    }
}
