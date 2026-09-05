import { formatArgentinaDate } from "@/lib/date-utils";
import { CircuitBoard, ExternalLink, FileText } from "lucide-react";
import type { RepairNotebookConsultation } from "@/lib/schematics/repair-notebook-db";

export function RepairConsultationList({ repairId, consultations }: { repairId: string; consultations: RepairNotebookConsultation[] }) {
  if (!consultations.length) return null;
  return <details>
    <summary className="cursor-pointer text-xs font-bold">Archivos consultados <span className="text-muted-foreground">({consultations.length})</span></summary>
    <div className="mt-2 space-y-1">
      {consultations.map((item) => {
        const target = item.assetKind === "pdf" ? `pdf=${encodeURIComponent(item.assetId)}` : `board=${encodeURIComponent(item.assetId)}`;
        const href = `/technician/schematics?repair=${encodeURIComponent(repairId)}&${target}`;
        return <a key={item.id} href={href} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-muted">
          {item.assetKind === "pdf" ? <FileText className="h-3.5 w-3.5" /> : <CircuitBoard className="h-3.5 w-3.5" />}
          <span className="min-w-0 flex-1 truncate">{item.assetName}</span>
          <time className="text-[10px] text-muted-foreground">{formatArgentinaDate(new Date(item.createdAt), "dd/MM/yyyy")}</time>
          <ExternalLink className="h-3 w-3" />
        </a>;
      })}
    </div>
  </details>;
}
