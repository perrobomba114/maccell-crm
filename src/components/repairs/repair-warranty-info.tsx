import { Eye, ShieldAlert, Wrench } from "lucide-react";
import { getOriginalRepairTechnicianName } from "@/lib/repair-warranty-info";
import { cn } from "@/lib/utils";

type WarrantyRepairLink = {
    id?: string;
    ticketNumber: string;
    problemDescription: string;
    assignedTo?: { name?: string | null } | null;
    statusHistory?: {
        user?: {
            name?: string | null;
            role?: string | null;
        } | null;
    }[];
};

type RepairWarrantyInfoProps = {
    isWarranty?: boolean;
    originalRepair?: WarrantyRepairLink | null;
    warrantyRepairs?: WarrantyRepairLink[];
    onOpenRepair?: (repairId: string) => void;
};

export function RepairWarrantyInfo({
    isWarranty,
    originalRepair,
    warrantyRepairs,
    onOpenRepair,
}: RepairWarrantyInfoProps) {
    const warrantyRepair = warrantyRepairs?.[0] ?? null;
    const linkedRepair = isWarranty ? originalRepair : warrantyRepair;
    if (!linkedRepair) return null;

    const canOpenLinkedRepair = Boolean(linkedRepair.id && onOpenRepair);
    const originalTechnician = isWarranty ? getOriginalRepairTechnicianName(originalRepair) : null;
    const openLinkedRepair = () => {
        if (linkedRepair.id) onOpenRepair?.(linkedRepair.id);
    };

    return (
        <div className="min-w-0">
            <div
                role={canOpenLinkedRepair ? "button" : undefined}
                tabIndex={canOpenLinkedRepair ? 0 : undefined}
                onClick={canOpenLinkedRepair ? openLinkedRepair : undefined}
                onKeyDown={(event) => {
                    if (!canOpenLinkedRepair) return;
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openLinkedRepair();
                    }
                }}
                className={cn(
                    "group relative w-full rounded-xl border p-3 text-left transition-all overflow-hidden",
                    canOpenLinkedRepair 
                        ? "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        : "border-amber-500/30 bg-amber-500/5 cursor-default",
                )}
                title={canOpenLinkedRepair ? "Hacer clic para abrir el ticket anterior" : undefined}
            >
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/15 shadow-sm group-hover:scale-105 transition-transform">
                        <ShieldAlert className="size-4.5 text-amber-300" />
                    </div>
                    
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                {isWarranty ? "Reingreso por garantía" : "Garantía vinculada"}
                            </p>
                            <span className="shrink-0 font-mono text-xs font-black text-white px-2 py-0.5 bg-black/40 border border-amber-500/40 rounded-md">
                                {linkedRepair.ticketNumber}
                            </span>
                        </div>

                        {isWarranty && (
                            <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-300">
                                <Wrench className="size-3 shrink-0 text-amber-400" />
                                <span className="shrink-0 text-slate-400">Técnico original:</span>
                                <span className="truncate font-bold uppercase text-white">{originalTechnician ?? "Sin registro"}</span>
                            </p>
                        )}

                        <p className="text-xs font-medium leading-relaxed text-slate-200 line-clamp-2">
                            <span className="font-bold text-amber-400">Problema anterior:</span>{" "}
                            {linkedRepair.problemDescription}
                        </p>

                        {canOpenLinkedRepair && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-300/80 group-hover:text-amber-200 flex items-center gap-1 pt-1">
                                <Eye className="size-3" />
                                <span>Ver detalle del ticket original</span>
                            </p>
                        )}
                    </div>

                    {canOpenLinkedRepair && (
                        <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/20 text-amber-200 group-hover:bg-amber-500/40 group-hover:text-white transition-colors" aria-label="Ver reparación vinculada">
                            <Eye className="h-4 w-4" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
