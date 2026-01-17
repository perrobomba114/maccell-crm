
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    console.time("API_TOTAL_DURATION");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        // Optimization: Clean ID and detect type to use findUnique (Index Scan) instead of findFirst with OR
        const cleanId = id.trim();
        let repair = null;

        console.log(`[API] Searching for ID: ${cleanId}`);

        // Heuristic: Ticket numbers usually have prefixes or specific formats, CUIDs are long alphanumeric
        // If it looks like a generated CUID (25+ chars, no hyphens usually, but let's be safe)
        console.time("DB_QUERY_DURATION");
        if (cleanId.length >= 20 && !cleanId.includes("MAC")) {
            repair = await db.repair.findUnique({
                where: { id: cleanId },
                include: {
                    branch: {
                        select: {
                            name: true,
                            address: true,
                            phone: true,
                            imageUrl: true,
                            // id: true // if needed
                        }
                    },
                    status: true,
                }
            });
        }

        // If not found by ID (or it looked like a ticket), try Ticket Number
        if (!repair) {
            repair = await db.repair.findUnique({
                where: { ticketNumber: cleanId },
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
        }
        console.timeEnd("DB_QUERY_DURATION");

        if (!repair) {
            console.log("[API] Repair NOT FOUND");
            return NextResponse.json({ error: "Repair not found" }, { status: 404 });
        }

        console.log("[API] Repair FOUND");

        // Return only necessary public info
        const response = NextResponse.json({
            id: repair.id,
            ticketNumber: repair.ticketNumber,
            createdAt: repair.createdAt,
            promisedAt: repair.promisedAt,
            deviceBrand: repair.deviceBrand,
            deviceModel: repair.deviceModel,
            problemDescription: repair.problemDescription,
            diagnosis: repair.diagnosis,
            statusId: repair.statusId,
            branch: repair.branch,
            isWet: (repair as any).isWet // Cast to any until prisma client regenerates fully or just rely on JS runtime if type isn't updated? Prisma client SHOULD be updated by db push.
        });

        console.timeEnd("API_TOTAL_DURATION");
        return response;

    } catch (error) {
        console.error("API Error:", error);
        console.timeEnd("API_TOTAL_DURATION");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
