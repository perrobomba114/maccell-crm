import { CircuitBoard, Columns2, FileText, PanelLeftClose, PanelLeftOpen, ScanSearch, Expand, Minimize, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type ViewMode = "board" | "split" | "pdf";
interface Props {
  expanded: boolean; onExpand: () => void; onHideControls: () => void;
  plates: number; documents: number; model: string; hasBoard: boolean; hasPdf: boolean;
  library: boolean; inspector: boolean; mode: ViewMode;
  onLibrary: () => void; onInspector: () => void; onMode: (mode: ViewMode) => void;
}

export function WorkbenchHeader(props: Props) {
  return <>
    <header className="sch-page-heading relative flex flex-wrap items-center gap-3 border-b p-4">

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500"><CircuitBoard className="h-6 w-6" /></div>
      <div className="flex-1">
        <h1 className="text-xl font-bold tracking-tight">Esquemáticos</h1>
        <p className="text-sm text-muted-foreground">Buscá el equipo. Abrí su placa o documentación.</p>
      </div>
      <div className="flex gap-2 text-xs font-semibold text-muted-foreground">
        <span className="rounded-lg border px-3 py-2">{props.plates} placas</span>
        <span className="rounded-lg border px-3 py-2">{props.documents} PDF</span>
      </div>
    </header>
    <div className="sch-topbar flex flex-wrap items-center gap-2 border-b p-3 sm:px-5">
      <Button variant="outline" size="sm" aria-label={props.library ? "Ocultar biblioteca" : "Mostrar biblioteca"} aria-pressed={props.library} onClick={props.onLibrary}>
        {props.library ? <PanelLeftClose /> : <PanelLeftOpen />} Biblioteca
      </Button>
      <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold">{props.model}</span>
      <div className="flex gap-1 rounded-xl border bg-muted/30 p-1" aria-label="Vista del documento">
        {([{ id: "board", label: "Placa", icon: CircuitBoard }, { id: "split", label: "Placa + PDF", icon: Columns2 }, { id: "pdf", label: "PDF", icon: FileText }] as const).map(({ id, label, icon: Icon }) =>
          <Button key={id} disabled={id === "board" ? !props.hasBoard : id === "pdf" ? !props.hasPdf : !props.hasBoard || !props.hasPdf} title={id === "split" && (!props.hasBoard || !props.hasPdf) ? "Abrí una placa y un PDF para usar esta vista" : undefined} size="sm" variant={props.mode === id ? "default" : "ghost"} aria-pressed={props.mode === id} onClick={() => props.onMode(id)}><Icon />{label}</Button>)}
      </div>
      <Button size="sm" variant="outline" onClick={props.onExpand} aria-label={props.expanded ? "Salir de pantalla completa" : "Ampliar visor"}>{props.expanded ? <Minimize /> : <Expand />}{props.expanded ? "Salir" : "Ampliar"}</Button>
      {props.expanded && <Button size="sm" variant="outline" aria-label="Ocultar controles" title="Sólo documento · H para mostrar controles" onClick={props.onHideControls}><EyeOff /></Button>}
      <Button variant={props.inspector ? "secondary" : "outline"} size="sm" aria-label="Mostrar u ocultar inspector" aria-pressed={props.inspector} onClick={props.onInspector}><ScanSearch />Componentes</Button>
    </div>
  </>;
}
