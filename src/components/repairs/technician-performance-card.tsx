"use client";

import { ArrowUpRight, Check, Clock, Trophy, Wrench } from "lucide-react";
import type { TechnicianPerformance } from "@/actions/repair-actions-extra";
import { cn } from "@/lib/utils";

const accents = [
    { avatar: "bg-purple-500/15 text-purple-600 dark:text-purple-300", line: "bg-purple-500", border: "border-purple-500/50", bar: "bg-purple-500" },
    { avatar: "bg-blue-500/15 text-blue-600 dark:text-blue-300", line: "bg-blue-500", border: "border-blue-500/50", bar: "bg-blue-500" },
    { avatar: "bg-orange-500/15 text-orange-600 dark:text-orange-300", line: "bg-orange-500", border: "border-orange-500/50", bar: "bg-orange-500" },
];

export function TechnicianPerformanceCard({ tech, index, active, disabled, statusName, onSelect }: {
    tech: TechnicianPerformance;
    index: number;
    active: boolean;
    disabled: boolean;
    statusName?: string;
    onSelect: () => void;
}) {
    const accent = accents[index % accents.length];
    const initials = tech.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("");
    return (
        <button
            type="button"
            aria-pressed={active}
            aria-label={`${tech.name}: ${tech.seenCount} ${statusName ? `reparaciones en ${statusName}` : "finalizadas"}. ${active ? "Quitar filtro" : "Filtrar técnico"}`}
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                "relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
                active ? `${accent.border} ring-1 ring-primary/20` : "border-border",
            )}
        >
            <span className={cn("absolute inset-x-0 top-0 h-1", accent.line)} />
            <span className="flex w-full items-center gap-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", accent.avatar)}>{initials}</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">{tech.name}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Wrench className="h-3 w-3" /> Técnico de laboratorio</span>
                </span>
                {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : index === 0 && tech.seenCount > 0 && !statusName ? <Trophy className="h-4 w-4 shrink-0 text-amber-500" /> : <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </span>
            <span className="my-4 flex w-full items-end justify-between gap-3">
                <span>
                    <span className="block text-4xl font-bold tracking-tight tabular-nums">{tech.seenCount}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{statusName ? `En ${statusName}` : "Finalizadas en el período"}</span>
                </span>
                <span className="shrink-0 rounded-lg border bg-muted/30 px-3 py-2">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> {statusName ? "Promedio del filtro" : "Promedio histórico"}</span>
                    <span className="mt-1 block text-right text-sm font-semibold tabular-nums">{tech.avgTime}</span>
                </span>
            </span>
            <span className="flex w-full flex-1 flex-col gap-2 border-t pt-3">
                {tech.outcomes.map(outcome => (
                    <span key={outcome.id} className="block">
                        <span className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 break-words text-muted-foreground">{outcome.name}</span>
                            <span className="font-semibold tabular-nums">{outcome.count}</span>
                        </span>
                        <span className="block h-1 overflow-hidden rounded-full bg-muted">
                            <span className={cn("block h-full rounded-full", accent.bar)} style={{ width: `${tech.seenCount ? outcome.count / tech.seenCount * 100 : 0}%` }} />
                        </span>
                    </span>
                ))}
                {tech.outcomes.length === 0 && <span className="py-2 text-xs text-muted-foreground">Sin reparaciones para estos filtros</span>}
            </span>
            <span className={cn("mt-3 text-xs font-medium", active ? "text-primary" : "text-muted-foreground")}>{active ? "Técnico seleccionado · clic para quitar" : "Ver reparaciones del técnico"}</span>
        </button>
    );
}
