"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpRight, Building2, Check, Clock3, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockDiscrepancyNotificationDetails } from "@/components/ui/stock-discrepancy-notification-details";
import { cn } from "@/lib/utils";
import type { NotificationCenterViewItem } from "@/lib/notification-center";

type NotificationRowProps = {
    notification: NotificationCenterViewItem;
    loading: boolean;
    onResponse: (id: string, response: "ACCEPTED" | "REJECTED") => void;
    onOpenLink: (href: string) => void;
};

export function NotificationRow({ notification, loading, onResponse, onOpenLink }: NotificationRowProps) {
    const isPending = notification.status === "PENDING";
    const tone = getToneClasses(notification.tone, isPending);
    const actionConfig = notification.actionConfig;
    const branchLabel = notification.branches.length > 0
        ? notification.branches.map((branch) => branch.name).join(" / ")
        : "Sin sucursal";

    return (
        <article className={cn("overflow-hidden rounded-xl border bg-card shadow-sm transition-colors", tone.border, tone.left)}>
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("rounded-md font-bold", tone.badge)}>
                            {notification.typeLabel}
                        </Badge>
                        <Badge variant="secondary" className="max-w-full rounded-md font-semibold">
                            <Building2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{branchLabel}</span>
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            {format(new Date(notification.createdAt), "d MMM yyyy HH:mm", { locale: es })}
                        </span>
                    </div>

                    <div className="min-w-0">
                        <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">
                            {notification.title}
                        </h2>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                            {notification.message}
                        </p>
                    </div>

                    <StockDiscrepancyNotificationDetails actionData={notification.actionData} />
                </div>

                <div className="flex flex-col gap-3 lg:min-w-[220px] lg:items-end">
                    <Badge className={cn("w-fit rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-widest", tone.status)}>
                        {notification.statusLabel}
                    </Badge>

                    {isPending && actionConfig.mode === "respond" && (
                        <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-1">
                            <Button
                                onClick={() => onResponse(notification.id, "ACCEPTED")}
                                disabled={loading}
                                className="h-10 justify-center bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="mr-2 h-4 w-4" />
                                )}
                                {actionConfig.acceptLabel}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onResponse(notification.id, "REJECTED")}
                                disabled={loading}
                                className="h-10 justify-center border-red-500/30 font-bold text-red-600 hover:bg-red-500/10 hover:text-red-700"
                            >
                                <X className="mr-2 h-4 w-4" />
                                {actionConfig.rejectLabel}
                            </Button>
                        </div>
                    )}

                    {actionConfig.mode === "link" && (
                        <Button
                            variant={isPending ? "default" : "outline"}
                            className="h-10 w-full justify-center font-bold lg:w-auto"
                            onClick={() => onOpenLink(actionConfig.href)}
                        >
                            {actionConfig.linkLabel}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

function getToneClasses(tone: NotificationCenterViewItem["tone"], isPending: boolean) {
    if (tone === "request") {
        return {
            border: isPending ? "border-blue-500/35" : "border-border",
            left: isPending ? "border-l-4 border-l-blue-500" : "",
            badge: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
            status: isPending
                ? "bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:text-amber-300"
                : "bg-muted text-muted-foreground",
        };
    }

    if (tone === "warning") {
        return {
            border: "border-amber-500/25",
            left: "border-l-4 border-l-amber-500",
            badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            status: "bg-muted text-muted-foreground",
        };
    }

    return {
        border: "border-border",
        left: "",
        badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
        status: "bg-muted text-muted-foreground",
    };
}
