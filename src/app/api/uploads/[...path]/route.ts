import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { withPantallasCors } from "@/lib/pantallas/cors";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: filePathArray } = await params;
        const publicDir = path.resolve(process.cwd(), "public");
        const uploadDir = path.resolve(process.cwd(), "upload");
        const publicFilePath = path.resolve(publicDir, ...filePathArray);
        const uploadFilePath = path.resolve(uploadDir, ...filePathArray);

        if (!publicFilePath.startsWith(publicDir + path.sep) || !uploadFilePath.startsWith(uploadDir + path.sep)) {
            return new NextResponse("Forbidden", { status: 403, headers: withPantallasCors() });
        }

        const filePath = fs.existsSync(uploadFilePath) ? uploadFilePath : publicFilePath;

        if (!fs.existsSync(filePath)) {
            console.error(`File not found at path: ${filePath}`);
            return new NextResponse("Not Found", { status: 404, headers: withPantallasCors() });
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
                headers: withPantallasCors({
                    "Content-Type": contentType,
                    "Content-Length": String(chunkSize),
                    "Content-Range": `bytes ${start}-${end}/${stats.size}`,
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=31536000, immutable",
                }),
            });
        }

        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
            headers: withPantallasCors({
                "Content-Type": contentType,
                "Content-Length": String(stats.size),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=31536000, immutable",
            }),
        });
    } catch (error) {
        console.error("Image serving error:", error);
        return new NextResponse("Internal Server Error", { status: 500, headers: withPantallasCors() });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: withPantallasCors() });
}
