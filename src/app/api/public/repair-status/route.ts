
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        const repair = await db.repair.findFirst({
            where: {
                OR: [
                    { id: id },
                    { ticketNumber: id }
                ]
            },
            include: {
                branch: {
                    select: {
                        name: true,
                        address: true,
                        phone: true,
                        imageUrl: true,
                    }
                },
                status: true,
            }
        });

        if (!repair) {
            return NextResponse.json({ error: "Repair not found" }, { status: 404 });
        }

        // Return only necessary public info
        return NextResponse.json({
            id: repair.id,
            ticketNumber: repair.ticketNumber,
            createdAt: repair.createdAt,
            promisedAt: repair.promisedAt,
            deviceBrand: repair.deviceBrand,
            deviceModel: repair.deviceModel,
            problemDescription: repair.problemDescription,
            diagnosis: repair.diagnosis,
            statusId: repair.statusId,
            branch: repair.branch
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
