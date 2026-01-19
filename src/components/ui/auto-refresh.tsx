"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
    intervalMs?: number;
}

export function AutoRefresh({ intervalMs = 60000 }: AutoRefreshProps) {
    const router = useRouter();

    useEffect(() => {
        const interval = setInterval(() => {
            // console.log("Auto-refreshing view...");
            router.refresh();
        }, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs, router]);

    return null; // Invisible component
}
