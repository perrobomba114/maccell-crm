
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getImgUrl, isValidImg } from "@/lib/utils";

function getRepairImages(rawImages: unknown): string[] {
    if (!Array.isArray(rawImages)) return [];

    const seen = new Set<string>();

    return rawImages
        .filter(isValidImg)
        .map((image) => getImgUrl(image))
        .filter((image): image is string => typeof image === "string" && image.trim() !== "")
        .filter((image) => {
            if (seen.has(image)) return false;
            seen.add(image);
            return true;
        });
}

export async function GET(request: Request) {
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
                    statusHistory: {
                        orderBy: { createdAt: 'desc' },
                        include: { fromStatus: true, toStatus: true }
                    }
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
                    statusHistory: {
                        orderBy: { createdAt: 'desc' },
                        include: { fromStatus: true, toStatus: true }
                    }
                }
            });
        }

        if (!repair) {
            return NextResponse.json({ error: "Repair not found" }, { status: 404 });
        }

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
            isWet: (repair as any).isWet,
            deviceImages: getRepairImages((repair as any).deviceImages),
            statusHistory: (repair as any).statusHistory || []
        });

        return response;

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
