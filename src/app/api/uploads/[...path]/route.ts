import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: filePathArray } = await params;
        const publicFilePath = path.join(process.cwd(), "public", ...filePathArray);
        const uploadFilePath = path.join(process.cwd(), "upload", ...filePathArray);

        // Security checks: ensure both candidates are inside allowed roots
        const publicDir = path.join(process.cwd(), "public");
        const uploadDir = path.join(process.cwd(), "upload");
        if (!publicFilePath.startsWith(publicDir) || !uploadFilePath.startsWith(uploadDir)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const filePath = fs.existsSync(uploadFilePath) ? uploadFilePath : publicFilePath;

        if (!fs.existsSync(filePath)) {
            console.error(`File not found at path: ${filePath}`);
            return new NextResponse("Not Found", { status: 404 });
        }

        const stats = fs.statSync(filePath);
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
            ".mp4": "video/mp4",
            ".webm": "video/webm",
        };

        const contentType = contentTypes[extension] || "application/octet-stream";
        const range = request.headers.get("range");

        if (range && (extension === ".mp4" || extension === ".webm")) {
            const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
            const start = Number.parseInt(startStr, 10);
            const end = endStr ? Number.parseInt(endStr, 10) : stats.size - 1;

            if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end >= stats.size || start > end) {
                return new NextResponse("Requested Range Not Satisfiable", {
                    status: 416,
                    headers: {
                        "Content-Range": `bytes */${stats.size}`,
                    },
                });
            }

            const chunkSize = end - start + 1;
            const stream = fs.createReadStream(filePath, { start, end });
            return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
                status: 206,
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": String(chunkSize),
                    "Content-Range": `bytes ${start}-${end}/${stats.size}`,
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            });
        }

        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": String(stats.size),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Image serving error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
