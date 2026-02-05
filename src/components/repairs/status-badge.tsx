import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RepairStatusBadgeProps {
    statusId: number;
    className?: string;
}

const STATUS_MAP: Record<number, { label: string; colorClass: string }> = {
    1: { label: "Ingresado", colorClass: "bg-blue-500 hover:bg-blue-600" },
    2: { label: "Tomado por Técnico", colorClass: "bg-indigo-600 hover:bg-indigo-700" },
    3: { label: "En Proceso", colorClass: "bg-yellow-500 hover:bg-yellow-600 text-black" },
    4: { label: "Pausado", colorClass: "bg-gray-500 hover:bg-gray-600" },
    5: { label: "Finalizado OK", colorClass: "bg-green-500 hover:bg-green-600" },
    6: { label: "No Reparado", colorClass: "bg-red-500 hover:bg-red-600" },
    7: { label: "Diagnosticado", colorClass: "bg-purple-500 hover:bg-purple-600" },
    8: { label: "Esperando Conf.", colorClass: "bg-orange-500 hover:bg-orange-600" },
    9: { label: "Esperando Rep.", colorClass: "bg-amber-500 hover:bg-amber-600 text-black" },
    10: { label: "Entregado", colorClass: "bg-slate-800 hover:bg-slate-900" },
};

export function RepairStatusBadge({ statusId, className }: RepairStatusBadgeProps) {
    const status = STATUS_MAP[statusId] || { label: "Desconocido", colorClass: "bg-gray-400" };

    return (
        <Badge className={cn("font-bold px-2 py-1 shadow-sm text-white", status.colorClass, className)}>
            {status.label}
        </Badge>
    );
}
