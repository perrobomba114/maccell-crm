import { CreditCard, MemoryStick } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import type { RepairAccessType } from "@/lib/repairs/intake";
import { cn } from "@/lib/utils";
import { RepairIntakeSummary } from "./repair-intake-summary";

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
    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Recepción del equipo</h3>
                <p className="mt-1 text-[10px] font-bold text-slate-500">
                    Verificá el acceso y corregí los elementos encontrados antes de cerrar.
                </p>
            </div>

            <RepairIntakeSummary
                accessType={accessType}
                accessCredential={accessCredential}
                hasSimCard={hasSimCard}
                hasMemoryCard={hasMemoryCard}
            />

            <div className="grid gap-3 sm:grid-cols-2">
                <label className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors",
                    hasSimCard
                        ? "border-cyan-400 bg-cyan-500/15 text-cyan-100"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700",
                )}>
                    <Checkbox
                        checked={hasSimCard}
                        onCheckedChange={(checked) => onSimCardChange(checked === true)}
                        className="data-[state=checked]:border-cyan-400 data-[state=checked]:bg-cyan-500"
                    />
                    <CreditCard className="h-5 w-5 text-cyan-400" />
                    <span className="text-xs font-black uppercase tracking-wider">SIM encontrada</span>
                </label>

                <label className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors",
                    hasMemoryCard
                        ? "border-violet-400 bg-violet-500/15 text-violet-100"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700",
                )}>
                    <Checkbox
                        checked={hasMemoryCard}
                        onCheckedChange={(checked) => onMemoryCardChange(checked === true)}
                        className="data-[state=checked]:border-violet-400 data-[state=checked]:bg-violet-500"
                    />
                    <MemoryStick className="h-5 w-5 text-violet-400" />
                    <span className="text-xs font-black uppercase tracking-wider">Memoria encontrada</span>
                </label>
            </div>
        </section>
    );
}
