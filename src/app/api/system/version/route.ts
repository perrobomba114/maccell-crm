
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // In production, we read the version file generated at build time
        const versionPath = path.join(process.cwd(), 'public', 'version.txt');
        let version = 'dev';

        if (fs.existsSync(versionPath)) {
            version = fs.readFileSync(versionPath, 'utf8').trim();
        } else {
            // Fallback: use current time if file missing (dev mode usually)
            // But in dev mode we don't want to reload constantly.
            // We'll return a static 'dev' unless strictly needed.
            version = 'dev';
        }

        return NextResponse.json({ version });
    } catch (error) {
        return NextResponse.json({ version: 'unknown' }, { status: 500 });
    }
}
