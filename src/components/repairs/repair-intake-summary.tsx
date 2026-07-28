import { CreditCard, Fingerprint, KeyRound, MemoryStick, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { summarizeRepairIntake, type RepairAccessType } from "@/lib/repairs/intake";
import { RepairPatternPreview } from "./repair-pattern-board";

interface RepairIntakeSummaryProps {
    accessType?: RepairAccessType | null;
    accessCredential?: string | null;
    hasSimCard?: boolean | null;
    hasMemoryCard?: boolean | null;
    compact?: boolean;
    fillHeight?: boolean;
}

export function RepairIntakeSummary({
    accessType = "NONE",
    accessCredential = null,
    hasSimCard = false,
    hasMemoryCard = false,
    compact = false,
    fillHeight = false,
}: RepairIntakeSummaryProps) {
    const normalizedType = accessType ?? "NONE";
    const summary = summarizeRepairIntake({
        accessType: normalizedType,
        accessCredential,
        hasSimCard: Boolean(hasSimCard),
        hasMemoryCard: Boolean(hasMemoryCard),
    });

    return (
        <section className={cn(
            "rounded-xl border border-amber-400/30 bg-slate-950 p-3 text-slate-100",
            fillHeight && "flex h-full flex-col",
        )} aria-label="Datos de recepción del equipo">
            <div className="flex items-center gap-2 text-amber-300">
                <ShieldCheck className="h-4 w-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.18em]">Recepción verificada</h3>
            </div>
            <div className={cn("mt-3 grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2", fillHeight && "flex-1")}>
                <div className={cn("rounded-lg border border-slate-800 bg-slate-900 p-3", fillHeight && "flex h-full flex-col justify-center")}>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {normalizedType === "CODE" ? <KeyRound className="h-3.5 w-3.5" /> : <Fingerprint className="h-3.5 w-3.5" />}
                        Acceso
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">{summary.accessLabel}</p>
                    {normalizedType === "CODE" && accessCredential ? (
                        <p className="mt-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-lg font-black tracking-[0.18em] text-amber-300">
                            {accessCredential}
                        </p>
                    ) : null}
                    {normalizedType === "PATTERN" && accessCredential ? (
                        <RepairPatternPreview
                            className="mt-3"
                            selectedPoints={accessCredential.split("-").map(Number)}
                        />
                    ) : null}
                </div>
                <div className={cn("rounded-lg border border-slate-800 bg-slate-900 p-3", fillHeight && "flex h-full flex-col justify-center")}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Elementos recibidos</p>
                    <p className="mt-1 text-sm font-bold text-white">{summary.accessoriesLabel}</p>
                    <div className="mt-3 flex gap-2">
                        {hasSimCard ? <CreditCard className="h-5 w-5 text-cyan-300" aria-label="SIM recibida" /> : null}
                        {hasMemoryCard ? <MemoryStick className="h-5 w-5 text-cyan-300" aria-label="Memoria recibida" /> : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
