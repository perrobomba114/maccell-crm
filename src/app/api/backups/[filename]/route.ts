import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    // Await params as per Next.js 15+ changes? Next 15 treats params as a Promise in some contexts, 
    // but typically headers/cookies are async. 
    // Correction: In Next 13/14 App Router, params is just an object. 
    // EXCEPT: Recent Next.js versions (15 canary) are moving to async params. 
    // Safe bet: await it if it's a promise, or treat as object if not.
    // However, the standard signature is often context.params.
    // Let's assume standard object for now or handle both.
    // Actually, looking at current `products.ts`, it's using standard actions. 
    // In Route Handlers: `export async function GET(request: Request, { params }: { params: { slug: string } })`

    // Wait, the user said "Next.js 15.1.2" in package.json.
    // In Next 15, params IS generic.

    const { filename } = await params;

    if (!filename) {
        return new NextResponse("Filename required", { status: 400 });
    }

    const BACKUP_DIR = path.join(process.cwd(), "backups");
    const filepath = path.join(BACKUP_DIR, filename);

    // Security check: Traversal
    if (!filepath.startsWith(BACKUP_DIR) || filename.includes("..")) {
        return new NextResponse("Invalid filename", { status: 400 });
    }

    if (!fs.existsSync(filepath)) {
        return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filepath);
    const stats = fs.statSync(filepath);

    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Type": "application/sql",
            "Content-Length": stats.size.toString(),
        },
    });
}
