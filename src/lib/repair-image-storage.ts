export const REPAIR_IMAGE_UPLOAD_PREFIX = "/api/uploads/repairs/images";
export const LEGACY_REPAIR_IMAGE_PUBLIC_PREFIX = "/repairs/images";

function normalizeSlashes(value: string) {
    return value.trim().replace(/\\/g, "/");
}

function getFilename(value: string) {
    const normalized = normalizeSlashes(value);
    const parts = normalized.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
}

export function buildRepairImageUploadUrl(filenameOrPath: string): string {
    const filename = getFilename(filenameOrPath);
    return filename ? `${REPAIR_IMAGE_UPLOAD_PREFIX}/${filename}` : "";
}

export function normalizeRepairImageUrl(url: string): string {
    const normalized = normalizeSlashes(url);

    if (normalized.startsWith(`${REPAIR_IMAGE_UPLOAD_PREFIX}/`)) {
        return normalized.startsWith("/") ? normalized : `/${normalized}`;
    }

    if (
        normalized.startsWith(`${LEGACY_REPAIR_IMAGE_PUBLIC_PREFIX}/`) ||
        normalized.startsWith(`${LEGACY_REPAIR_IMAGE_PUBLIC_PREFIX.slice(1)}/`)
    ) {
        return buildRepairImageUploadUrl(normalized);
    }

    return normalized;
}

export function getRepairImageUploadSubpath(filenameOrPath: string): string {
    const filename = getFilename(filenameOrPath);
    return filename ? `repairs/images/${filename}` : "";
}

export function getRepairImageUploadSubpathFromUrl(url: string): string {
    const normalized = normalizeSlashes(url);
    const isRepairImageUrl = (
        normalized.startsWith(`${REPAIR_IMAGE_UPLOAD_PREFIX}/`) ||
        normalized.startsWith(`${REPAIR_IMAGE_UPLOAD_PREFIX.slice(1)}/`) ||
        normalized.startsWith(`${LEGACY_REPAIR_IMAGE_PUBLIC_PREFIX}/`) ||
        normalized.startsWith(`${LEGACY_REPAIR_IMAGE_PUBLIC_PREFIX.slice(1)}/`)
    );

    return isRepairImageUrl ? getRepairImageUploadSubpath(normalized) : "";
}
