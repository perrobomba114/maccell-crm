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
        <div
            className="min-w-0"
        >
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
                    "w-full rounded-xl border border-amber-400/45 bg-amber-500/10 p-2.5 text-left transition-colors",
                    canOpenLinkedRepair && "cursor-pointer hover:border-yellow-300 hover:bg-yellow-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    !canOpenLinkedRepair && "cursor-default",
                )}
                title={canOpenLinkedRepair ? "Ver detalle de la reparación vinculada" : undefined}
            >
                <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10">
                        <ShieldAlert className="size-4 text-amber-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                {isWarranty ? "Reingreso por garantía" : "Garantía vinculada"}
                            </p>
                            <span className="shrink-0 font-mono text-[11px] font-black text-white">{linkedRepair.ticketNumber}</span>
                        </div>
                        {isWarranty ? (
                            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-300">
                                <Wrench className="size-3 shrink-0 text-amber-400" />
                                <span className="shrink-0 text-slate-500">Técnico original:</span>
                                <span className="truncate font-bold uppercase text-white">{originalTechnician ?? "Sin registro"}</span>
                            </p>
                        ) : null}
                        <p className="mt-1 line-clamp-1 text-xs font-medium leading-4 text-slate-300">
                            <span className="font-bold text-amber-400">Problema anterior:</span>{" "}
                            {linkedRepair.problemDescription}
                        </p>
                    </div>
                    {canOpenLinkedRepair && (
                        <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-black/20 text-amber-200" aria-label="Ver reparación vinculada">
                            <Eye className="h-3.5 w-3.5" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
