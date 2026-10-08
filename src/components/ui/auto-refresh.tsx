"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
    intervalMs?: number;
    pauseWhileDialogOpen?: boolean;
}

export function AutoRefresh({ intervalMs = 60000, pauseWhileDialogOpen = false }: AutoRefreshProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState !== "visible" || isPending) return;
            if (pauseWhileDialogOpen && document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
            startTransition(() => router.refresh());
        };
        const interval = window.setInterval(refresh, intervalMs);
        window.addEventListener("focus", refresh);
        window.addEventListener("online", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", refresh);
            window.removeEventListener("online", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [intervalMs, pauseWhileDialogOpen, isPending, router]);

    return null;
}
