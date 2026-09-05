import { formatArgentinaDate } from "@/lib/date-utils";
import { ExternalLink, FileText, Gauge } from "lucide-react";
import type { RepairNotebookEntry } from "@/lib/schematics/repair-notebook-db";

export function RepairNotebookEntryList({ entries }: { entries: RepairNotebookEntry[] }) {
  if (!entries.length) return <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Todavía no hay registros vinculados.</p>;
  return <div className="space-y-2">
    {entries.map((entry) => <article key={entry.id} className="rounded-lg border bg-background/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {entry.kind === "measurement" ? <Gauge className="h-4 w-4 text-cyan-500" /> : <FileText className="h-4 w-4 text-amber-500" />}
          <strong className="text-sm">{entry.kind === "measurement" ? `${entry.value?.toLocaleString("es-AR", { maximumFractionDigits: 12 })} ${entry.unit}` : "Nota técnica"}</strong>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">{entry.evidence === "measured" ? "Medido" : "Documentado"}</span>
        </div>
        <time className="shrink-0 text-[10px] text-muted-foreground">{formatArgentinaDate(new Date(entry.createdAt), "dd/MM HH:mm")}</time>
      </div>
      {(entry.component || entry.pad) ? <p className="mt-2 text-xs font-medium">{entry.component ?? "Sin componente"}{entry.pad ? ` · pad ${entry.pad}` : ""}</p> : null}
      {entry.note ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{entry.note}</p> : null}
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>{entry.author.name}{entry.page ? ` · pág. ${entry.page}` : ""}</span>
        {entry.documentUrl ? <a className="inline-flex items-center gap-1 text-cyan-600 hover:underline" href={entry.documentUrl}>Abrir fuente <ExternalLink className="h-3 w-3" /></a> : null}
      </div>
    </article>)}
  </div>;
}
