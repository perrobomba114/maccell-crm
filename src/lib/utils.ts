import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { normalizeRepairImageUrl } from "./repair-image-storage";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getImgUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === "" || url === 'undefined' || url === 'null' || url.includes('/undefined')) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("data:")) return url;

    const trimmedUrl = url.trim().replace(/\\/g, "/");

    // Keep already-public /api/uploads paths as-is
    if (trimmedUrl.startsWith("/api/uploads")) return trimmedUrl;
    if (trimmedUrl.startsWith("api/uploads")) return `/${trimmedUrl}`;

    const repairImageUrl = normalizeRepairImageUrl(trimmedUrl);
    if (repairImageUrl.startsWith("/api/uploads/repairs/images/")) {
        return repairImageUrl;
    }

    // Dynamic uploads are served through the endpoint; public remains for static assets only.
    if (trimmedUrl.startsWith("/branches/")) {
        return `/api/uploads/branches/${trimmedUrl.slice("/branches/".length)}`;
    }
    if (trimmedUrl.startsWith("/profiles/")) {
        return `/api/uploads/profiles/${trimmedUrl.slice("/profiles/".length)}`;
    }

    // Handle legacy paths missing leading slash
    if (trimmedUrl.startsWith("branches/")) {
        return `/api/uploads/${trimmedUrl}`;
    }
    if (trimmedUrl.startsWith("profiles/")) {
        return `/api/uploads/${trimmedUrl}`;
    }

    // Handle raw filenames that might be missing the folder prefix
    if (trimmedUrl.startsWith("profile-")) {
        return `/api/uploads/profiles/${trimmedUrl}`;
    }
    if (trimmedUrl.startsWith("branch-")) {
        return `/api/uploads/branches/${trimmedUrl}`;
    }

    // Already has the prefix
    if (trimmedUrl.startsWith("/api/uploads")) return trimmedUrl;

    return trimmedUrl;
}

export function isValidImg(url: unknown): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (
        trimmed.length > 5 &&
        trimmed.includes('/') &&
        !trimmed.includes('undefined') &&
        !trimmed.includes('null') &&
        trimmed !== '[object File]'
    );
}
