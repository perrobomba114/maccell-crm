import { isGroundNet } from "@/lib/schematics/net-style";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { connectionsFor } from "@/lib/schematics/connections";
import type { PcbeDocument } from "@/lib/schematics/types";

interface Props { board: PcbeDocument; component: string | null; net: number | null; onSelect: (component: string | null, net: number | null) => void; onFocus: () => void }
export function ConnectionInspector({ board, component, net, onSelect, onFocus }: Props) {
  const connections = useMemo(() => connectionsFor(board.components, component, net), [board, component, net]);
  const part = board.components.find(item => item.id === component);
  const names = new Map(board.netCatalog.map(item => [item.id, item.name]));
  const selectedName = net === null ? "" : names.get(net) ?? "";
  const ground = isGroundNet(selectedName);
  if (!part && net === null) return <p className="p-3 text-xs leading-relaxed text-muted-foreground">Seleccioná un componente en la placa para ver sus pads y conexiones.</p>;
  return <section className="border-y border-border">
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Conexiones</h3><Button size="sm" variant="outline" onClick={onFocus}>Centrar</Button></div>
      {net !== null && <div className={ground ? "rounded-lg border border-purple-400/40 bg-purple-400/10 p-3 text-purple-300" : "rounded-lg border p-3"}>
        <strong className="text-sm">{ground ? "⏚ GND · Masa" : selectedName}</strong>
        <p className="mt-1 text-xs leading-relaxed">{ground ? "Red de referencia y retorno del circuito. No es una línea de alimentación principal. Que muchos pads compartan GND es normal y no demuestra un cortocircuito." : /^Net\s+\d+$/i.test(selectedName) ? "Red sin nombre identificado. No se puede confirmar GND ni alimentación por la cantidad de pads conectados." : "Nombre de red informado por el archivo."}</p>
      </div>}
      <p className="text-xs text-muted-foreground">{connections.nets.size} redes · {connections.components.length} componentes conectados</p>
      <p className="text-xs"><span className="text-amber-400">● Selección</span> · <span className="text-cyan-400">● Red</span> · <span className="text-purple-400">● GND · Masa</span> · <span className="text-blue-400">● Conectados</span></p>
      {part && net !== null && <Button size="sm" variant="secondary" onClick={() => onSelect(component, null)}>Ver todas sus redes</Button>}
    </div>
    {part && <details open><summary className="cursor-pointer px-3 py-2 text-xs font-bold">Pads de {part.name} ({part.pads.length})</summary><div className="max-h-52 overflow-auto">{part.pads.map(pad => <button key={pad.id} disabled={pad.netIndex === null} aria-pressed={net !== null && pad.netIndex === net} className="sch-result" onClick={() => onSelect(component, pad.netIndex)}><span>{pad.name}</span><small>{pad.netIndex === null ? "Sin red" : names.get(pad.netIndex) ?? `Red ${pad.netIndex}`}</small></button>)}</div></details>}
    <details open><summary className="cursor-pointer px-3 py-2 text-xs font-bold">Componentes conectados ({connections.components.length})</summary><div className="max-h-52 overflow-auto">{connections.components.slice(0, 100).map(other => <button key={other.id} className="sch-result" onClick={() => { onSelect(other.id, net); onFocus(); }}><span>{other.name}</span><small>{other.pads.filter(p => p.netIndex !== null && connections.nets.has(p.netIndex)).map(p => p.name).join(", ")}</small></button>)}{connections.components.length > 100 && <p className="p-3 text-xs text-muted-foreground">Mostrando 100. Elegí un pad para aislar su red.</p>}</div></details>
    <p className="p-3 text-xs text-muted-foreground">Conexiones según los IDs de red del archivo. No representan necesariamente pistas físicas dibujadas.</p>
  </section>;
}
