import { Button } from "@/components/ui/button";
import type { PcbeLayer } from "@/lib/schematics/types";
import type { BoardDetail } from "@/lib/schematics/visibility";

interface Props {
  catalog: PcbeLayer[]; layers: Set<number>; detail: BoardDetail; vias: boolean; overlay: boolean;
  onLayer: (id: number) => void; onDetail: (value: BoardDetail) => void; onVias: () => void; onOverlay: () => void;
}
export function LayerControls(p: Props) {
  return <div className="sch-layer-controls space-y-2 border-t p-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold">VISTA</span>
      {([{ id: "clean", label: "Componentes" }, { id: "tracks", label: "Con pistas" }, { id: "all", label: "Detalle completo" }] as const).map(item => <Button key={item.id} size="sm" variant={p.detail === item.id ? "secondary" : "ghost"} aria-pressed={p.detail === item.id} onClick={() => p.onDetail(item.id)}>{item.label}</Button>)}
      <Button size="sm" variant="outline" aria-pressed={p.vias} onClick={p.onVias}>Vías: {p.vias ? "sí" : "no"}</Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold">CAPA</span>
      <select aria-label="Capa visible" className="h-9 rounded-lg border bg-background px-2 text-sm" value={p.layers.size === 1 ? [...p.layers][0] : ""} onChange={event => p.onLayer(Number(event.target.value))}>
        {p.layers.size !== 1 && <option value="" disabled>Varias capas ({p.layers.size})</option>}
        {p.catalog.map(layer => <option key={layer.id} value={layer.id}>L{layer.id} · {layer.primitiveCount.toLocaleString("es-AR")} elementos</option>)}
      </select>
      <Button size="sm" variant="ghost" aria-pressed={p.overlay} onClick={p.onOverlay}>Superponer: {p.overlay ? "sí" : "no"}</Button>
    </div>
    <p className="text-xs text-muted-foreground">{p.overlay ? "Las capas elegidas se suman. Desactivá Superponer para volver a una sola." : "Una capa a la vez. Componentes oculta pistas, textos y arcos."} Las conexiones ocultas siguen disponibles en el inspector.</p>
  </div>;
}
