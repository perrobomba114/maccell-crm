import { CreditCard, Fingerprint, KeyRound, MemoryStick, ShieldCheck } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import type { RepairAccessType } from "@/lib/repairs/intake";
import { cn } from "@/lib/utils";
import { RepairPatternPreview } from "./repair-pattern-board";

interface FinishRepairIntakeCheckProps {
    accessType?: RepairAccessType | null;
    accessCredential?: string | null;
    hasSimCard: boolean;
    hasMemoryCard: boolean;
    onSimCardChange: (checked: boolean) => void;
    onMemoryCardChange: (checked: boolean) => void;
}

export function FinishRepairIntakeCheck({
    accessType,
    accessCredential,
    hasSimCard,
    hasMemoryCard,
    onSimCardChange,
    onMemoryCardChange,
}: FinishRepairIntakeCheckProps) {
    const normalizedType = accessType ?? "NONE";
    const patternPoints = normalizedType === "PATTERN" && accessCredential
        ? accessCredential.split("-").map(Number).filter((point) => point >= 1 && point <= 9)
        : [];

    const accessDetails = normalizedType === "CODE"
        ? { label: "Código / PIN", value: accessCredential || "No informado", Icon: KeyRound }
        : normalizedType === "PATTERN"
            ? { label: "Patrón de acceso", value: `${patternPoints.length} puntos registrados`, Icon: Fingerprint }
            : { label: "Sin código / No autoriza", value: "El equipo no tiene bloqueo o el cliente no autoriza el acceso", Icon: ShieldCheck };

    return (
        <section className="h-full rounded-2xl border border-amber-400/35 bg-amber-500/[0.055] p-3">
            <div className="flex items-center gap-2 text-amber-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.22em]">Recepción verificada</h3>
            </div>

            <div className="mt-3 flex min-h-20 items-center justify-between gap-3 rounded-xl border border-amber-300/15 bg-slate-950/75 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                        <accessDetails.Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Acceso del equipo</p>
                        <p className="mt-0.5 truncate text-sm font-black text-white">{accessDetails.label}</p>
                        <p className={cn(
                            "mt-0.5 text-[11px] font-bold leading-snug",
                            normalizedType === "CODE" ? "font-mono tracking-widest text-amber-300" : "text-slate-500",
                        )}>
                            {accessDetails.value}
                        </p>
                    </div>
                </div>

                {normalizedType === "PATTERN" && patternPoints.length > 0 ? (
                    <RepairPatternPreview
                        className="h-[76px] w-[76px] shrink-0 rounded-lg p-1"
                        selectedPoints={patternPoints}
                    />
                ) : null}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
                <label className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors",
                    hasSimCard
                        ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100"
                        : "border-slate-800 bg-slate-950/75 text-slate-300 hover:border-slate-700",
                )}>
                    <Checkbox
                        checked={hasSimCard}
                        onCheckedChange={(checked) => onSimCardChange(checked === true)}
                        className="data-[state=checked]:border-cyan-400 data-[state=checked]:bg-cyan-500"
                    />
                    <CreditCard className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="truncate text-[10px] font-black uppercase tracking-wider">SIM encontrada</span>
                </label>

                <label className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors",
                    hasMemoryCard
                        ? "border-violet-400/70 bg-violet-500/15 text-violet-100"
                        : "border-slate-800 bg-slate-950/75 text-slate-300 hover:border-slate-700",
                )}>
                    <Checkbox
                        checked={hasMemoryCard}
                        onCheckedChange={(checked) => onMemoryCardChange(checked === true)}
                        className="data-[state=checked]:border-violet-400 data-[state=checked]:bg-violet-500"
                    />
                    <MemoryStick className="h-4 w-4 shrink-0 text-violet-400" />
                    <span className="truncate text-[10px] font-black uppercase tracking-wider">Memoria encontrada</span>
                </label>
            </div>
        </section>
    );
}
