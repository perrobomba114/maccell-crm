import fs from "fs/promises";
import path from "path";

type MigrationBucket = {
    label: string;
    from: string;
    to: string;
};

const buckets: MigrationBucket[] = [
    { label: "repair images", from: "public/repairs/images", to: "upload/repairs/images" },
    { label: "branch images", from: "public/branches", to: "upload/branches" },
    { label: "profile images", from: "public/profiles", to: "upload/profiles" },
    { label: "knowledge media", from: "public/knowledge", to: "upload/knowledge" },
];

const execute = process.argv.includes("--execute");
const root = process.cwd();

function isIgnoredFile(fileName: string) {
    return fileName === ".DS_Store" || fileName.startsWith(".");
}

async function pathExists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function migrateBucket(bucket: MigrationBucket) {
    const sourceDir = path.join(root, bucket.from);
    const targetDir = path.join(root, bucket.to);

    if (!(await pathExists(sourceDir))) {
        return { moved: 0, skipped: 0, missing: true };
    }

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    let moved = 0;
    let skipped = 0;

    if (execute) {
        await fs.mkdir(targetDir, { recursive: true });
    }

    for (const entry of entries) {
        if (!entry.isFile() || isIgnoredFile(entry.name)) {
            skipped++;
            continue;
        }

        const sourceFile = path.join(sourceDir, entry.name);
        const targetFile = path.join(targetDir, entry.name);

        if (await pathExists(targetFile)) {
            skipped++;
            continue;
        }

        moved++;
        if (execute) {
            await fs.copyFile(sourceFile, targetFile);
            await fs.unlink(sourceFile);
        }
    }

    return { moved, skipped, missing: false };
}

async function main() {
    console.warn(execute ? "[uploads:migrate] Moving files" : "[uploads:migrate] Dry run only. Add --execute to move files.");

    for (const bucket of buckets) {
        const result = await migrateBucket(bucket);
        const status = result.missing ? "missing source" : `${result.moved} to move, ${result.skipped} skipped`;
        console.warn(`[uploads:migrate] ${bucket.label}: ${status}`);
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown migration error";
    console.error("[uploads:migrate] Failed:", message);
    process.exit(1);
});
