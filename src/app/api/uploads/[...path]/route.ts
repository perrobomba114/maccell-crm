import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const filePathArray = await params.path;
        const filePath = path.join(process.cwd(), "public", ...filePathArray);

        // Security check: ensure the path is within the public folder
        const publicDir = path.join(process.cwd(), "public");
        if (!filePath.startsWith(publicDir)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            console.error(`File not found at path: ${filePath}`);
            return new NextResponse("Not Found", { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const extension = path.extname(filePath).toLowerCase();

        const contentTypes: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".heic": "image/heic",
            ".heif": "image/heif",
        };

        const contentType = contentTypes[extension] || "application/octet-stream";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Image serving error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
