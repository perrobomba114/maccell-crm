"use client";
import { useState } from "react";
import type { PcbeDocument } from "@/lib/schematics/types";

export function CircuitExplorer({ board, query, component, net, onSelect }: { board: PcbeDocument | null; query: string; component: string | null; net: number | null; onSelect(component: string | null, net: number | null): void }) {
  const [componentLimit, setComponentLimit] = useState(80);
  const [netLimit, setNetLimit] = useState(60);
  const components = (board?.components ?? []).filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  const nets = (board?.netCatalog ?? []).filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  return <>
    <details open><summary>Componentes <span>{components.length} coincidencias</span></summary>
      {components.slice(0, componentLimit).map(item => <button className="sch-result" aria-pressed={component === item.id} key={item.id} onClick={() => onSelect(item.id, null)}><span>{item.name}</span><small>{item.kind}</small></button>)}
      {components.length > componentLimit && <button className="sch-more" onClick={() => setComponentLimit(value => value + 80)}>Ver más ({componentLimit} de {components.length})</button>}
    </details>
    <details open={!!query}><summary>Redes eléctricas <span>{nets.length} coincidencias</span></summary>
      {nets.slice(0, netLimit).map(item => <button className="sch-result" aria-pressed={net === item.id} key={item.id} onClick={() => onSelect(null, item.id)}><span>{item.name}</span><small>{item.pinCount} pads</small></button>)}
      {nets.length > netLimit && <button className="sch-more" onClick={() => setNetLimit(value => value + 60)}>Ver más ({netLimit} de {nets.length})</button>}
    </details>
  </>;
}
