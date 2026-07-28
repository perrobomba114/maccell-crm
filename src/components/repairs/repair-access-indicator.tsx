import { Fingerprint, KeyRound, ShieldCheck } from "lucide-react";

import type { RepairAccessType } from "@/lib/repairs/intake";
import { cn } from "@/lib/utils";

interface RepairAccessIndicatorProps {
    accessType?: RepairAccessType | null;
    accessCredential?: string | null;
    className?: string;
}

function getAccessDisplay(accessType: RepairAccessType, accessCredential?: string | null) {
    if (accessType === "CODE") {
        return {
            icon: KeyRound,
            label: "PIN",
            value: accessCredential?.trim() || "Registrado",
            color: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
        };
    }

    if (accessType === "PATTERN") {
        return {
            icon: Fingerprint,
            label: "Patrón",
            value: accessCredential?.split("-").filter(Boolean).join(" → ") || "Registrado",
            color: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        };
    }

    return {
        icon: ShieldCheck,
        label: "Acceso",
        value: "Sin bloqueo",
        color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
}

export function RepairAccessIndicator({
    accessType = "NONE",
    accessCredential,
    className,
}: RepairAccessIndicatorProps) {
    const display = getAccessDisplay(accessType ?? "NONE", accessCredential);
    const Icon = display.icon;

    return (
        <div className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold",
            display.color,
            className,
        )}>
            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider opacity-70">{display.label}</span>
            <span className="truncate font-mono text-[11px] font-black" title={display.value}>{display.value}</span>
        </div>
    );
}
