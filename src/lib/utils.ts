import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getImgUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === "" || url === 'undefined' || url === 'null' || url.includes('/undefined')) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("data:")) return url;

    const trimmedUrl = url.trim();

    // Ensure it starts with /api/uploads if it's a local path
    if (trimmedUrl.startsWith("/repairs/images") || trimmedUrl.startsWith("/branches") || trimmedUrl.startsWith("/profiles")) {
        return `/api/uploads${trimmedUrl.startsWith("/") ? "" : "/"}${trimmedUrl}`;
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
