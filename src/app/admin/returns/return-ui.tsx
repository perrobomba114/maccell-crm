"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock3, MessageSquareText, PackageCheck, Phone, Ticket, UserRound, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { ReturnPart, ReturnRequestForAdmin, ReturnStatus } from "./return-types";

export const STATUS_OPTIONS: { value: ReturnStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "Todas" },
    { value: "PENDING", label: "Pendientes" },
    { value: "ACCEPTED", label: "Aceptadas" },
    { value: "REJECTED", label: "Rechazadas" },
];

type MetricCardProps = {
    label: string;
    value: number;
    icon: ReactNode;
    tone: "amber" | "emerald" | "rose" | "slate";
};

const metricTone = {
    amber: { gradient: "from-amber-400 to-orange-600", text: "text-amber-100" },
    emerald: { gradient: "from-emerald-500 to-emerald-700", text: "text-emerald-100" },
    rose: { gradient: "from-rose-500 to-red-700", text: "text-rose-100" },
    slate: { gradient: "from-blue-500 to-indigo-600", text: "text-blue-100" },
};

export function MetricCard({ label, value, icon, tone }: MetricCardProps) {
    const config = metricTone[tone];

    return (
        <Card className={cn("relative overflow-hidden border-none bg-gradient-to-br text-white shadow-lg", config.gradient)}>
            <CardContent className="flex min-h-[180px] flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                    <p className={cn("line-clamp-2 min-h-[2.5rem] text-sm font-medium", config.text)}>{label}</p>
                    <div className="shrink-0 rounded-xl bg-white/20 p-3 text-white backdrop-blur-sm">{icon}</div>
                </div>
                <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</h3>
                <div className={cn("mt-auto pt-4 text-sm", config.text)}>Solicitudes</div>
            </CardContent>
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </Card>
    );
}

export function StatusBadge({ status }: { status: ReturnStatus }) {
    const config = {
        PENDING: {
            icon: <Clock3 className="h-3.5 w-3.5" />,
            label: "Pendiente",
            className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
        },
        ACCEPTED: {
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            label: "Aceptada",
            className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
        },
        REJECTED: {
            icon: <XCircle className="h-3.5 w-3.5" />,
            label: "Rechazada",
            className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
        },
    }[status];

    return (
        <Badge variant="outline" className={cn("gap-1.5 rounded-md px-2.5 py-1 font-bold", config.className)}>
            {config.icon}
            {config.label}
        </Badge>
    );
}

export function getReturnParts(req: ReturnRequestForAdmin): ReturnPart[] {
    if (Array.isArray(req.partsSnapshot)) {
        return req.partsSnapshot.flatMap((part) => {
            if (!part || typeof part !== "object") return [];
            const snapshot = part as Record<string, unknown>;
            const quantity = Number(snapshot.quantity);
            const name = typeof snapshot.name === "string" ? snapshot.name : "";
            const code = typeof snapshot.code === "string" ? snapshot.code : typeof snapshot.sku === "string" ? snapshot.sku : "";
            return quantity > 0 && name ? [{ quantity, name, code }] : [];
        });
    }

    return req.repair.parts.map((part) => ({
        quantity: part.quantity,
        name: part.sparePart.name,
        code: part.sparePart.code || part.sparePart.sku || "",
    }));
}

export function PartsStack({ parts }: { parts: ReturnPart[] }) {
    if (parts.length === 0) {
        return <span className="text-xs italic text-muted-foreground">Sin repuestos</span>;
    }

    return (
        <div className="flex max-w-[280px] flex-wrap gap-1.5">
            {parts.slice(0, 3).map((part, index) => (
                <Badge key={`${part.name}-${index}`} variant="secondary" className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {part.quantity}x {part.name}
                </Badge>
            ))}
            {parts.length > 3 && (
                <Badge variant="outline" className="rounded-md px-2 py-1 text-xs">
                    +{parts.length - 3}
                </Badge>
            )}
        </div>
    );
}

export function NotePreview({ note }: { note: string | null }) {
    const text = note?.trim() || "Sin observación del técnico";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button className="flex max-w-[260px] items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted">
                        <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{text}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs text-sm">{text}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

type MobileReturnCardProps = {
    req: ReturnRequestForAdmin;
    onResolve: (req: ReturnRequestForAdmin, type: "ACCEPTED" | "REJECTED") => void;
};

export function MobileReturnCard({ req, onResolve }: MobileReturnCardProps) {
    const parts = getReturnParts(req);

    return (
        <article className="rounded-lg border bg-card p-4 shadow-sm md:hidden">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 font-mono text-sm font-black">
                        <Ticket className="h-4 w-4 text-orange-600" />
                        #{req.repair.ticketNumber}
                    </div>
                    <p className="mt-1 text-sm font-semibold">{req.repair.customer.name}</p>
                </div>
                <StatusBadge status={req.status} />
            </div>

            <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    <span>{req.technician.name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{req.repair.customer.phone || "Sin teléfono"}</span>
                </div>
                <PartsStack parts={parts} />
                <NotePreview note={req.technicianNote} />
            </div>

            {req.status === "PENDING" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onResolve(req, "ACCEPTED")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Aceptar
                    </Button>
                    <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onResolve(req, "REJECTED")}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Rechazar
                    </Button>
                </div>
            )}
        </article>
    );
}

export function formatReturnDate(date: Date | string) {
    return {
        day: format(new Date(date), "dd MMM", { locale: es }),
        time: format(new Date(date), "HH:mm"),
    };
}

export function EmptyReturnsState() {
    return (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 p-8 text-center">
            <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                <PackageCheck className="h-8 w-8" />
            </div>
            <div>
                <p className="font-bold">No hay devoluciones para revisar</p>
                <p className="mt-1 text-sm text-muted-foreground">Cuando un técnico solicite devolver repuestos, va a aparecer acá.</p>
            </div>
        </div>
    );
}
