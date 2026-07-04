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
        <div className="space-y-2">
            <h3 className="text-[11px] font-black text-yellow-500 uppercase tracking-[0.3em] pl-1 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-yellow-500" />
                INFORMACIÓN DE GARANTÍA
            </h3>
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
                    "w-full text-left bg-yellow-600/20 border-2 border-yellow-500/50 p-5 rounded-2xl shadow-inner transition-all",
                    canOpenLinkedRepair && "cursor-pointer hover:border-yellow-300 hover:bg-yellow-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    !canOpenLinkedRepair && "cursor-default",
                )}
                title={canOpenLinkedRepair ? "Ver detalle de la reparación vinculada" : undefined}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                        <p className="text-sm font-bold text-yellow-500">
                            {isWarranty ? "Boleta Anterior" : "Garantía Generada"}:{" "}
                            <span className="text-white font-black">{linkedRepair.ticketNumber}</span>
                        </p>
                        {isWarranty && (
                            <p className="text-sm font-medium leading-relaxed text-white/90">
                                <span className="inline-flex items-center gap-1 font-bold text-yellow-500">
                                    <Wrench className="h-3.5 w-3.5" />
                                    Técnico original:
                                </span>{" "}
                                <span className="font-black italic uppercase text-white">
                                    {originalTechnician ?? "Sin registro"}
                                </span>
                            </p>
                        )}
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-white/90 italic">
                            <span className="font-bold text-yellow-500">
                                {isWarranty ? "Problema Anterior" : "Problema Garantía"}:
                            </span>{" "}
                            {linkedRepair.problemDescription}
                        </p>
                    </div>
                    {canOpenLinkedRepair && (
                        <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/40 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-yellow-200">
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
