import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getImgUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === "" || url === 'undefined' || url === 'null' || url.includes('/undefined')) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("data:")) return url;

    // Ensure it starts with /api/uploads if it's a local path
    if (url.startsWith("/repairs/images") || url.startsWith("/branches") || url.startsWith("/profiles")) {
        return `/api/uploads${url.startsWith("/") ? "" : "/"}${url.trim()}`;
    }

    // Already has the prefix
    if (url.startsWith("/api/uploads")) return url.trim();

    return url.trim();
}

export function isValidImg(url: any): boolean {
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
