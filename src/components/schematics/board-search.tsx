import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { PcbeComponent } from "@/lib/schematics/types";

export function BoardSearch({ components, onSelect }: { components: PcbeComponent[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(30);
  const results = useMemo(() => {
    const term = query.trim().toUpperCase();
    return term ? components.filter(part => part.name.toUpperCase().includes(term)).sort((a, b) => Number(b.name.toUpperCase() === term) - Number(a.name.toUpperCase() === term) || a.name.localeCompare(b.name, "es", { numeric: true })) : [];
  }, [components, query]);
  function choose(id: string) { onSelect(id); setOpen(false); }
  return <div className="relative min-w-40 flex-1 max-w-sm">
    <form className="flex items-center gap-2 rounded-lg border bg-background px-2" onSubmit={event => { event.preventDefault(); if (results[0]) choose(results[0].id); }}>
      <Search size={16} />
      <input className="h-9 w-full bg-transparent text-sm outline-none" aria-label="Buscar componente en la placa" placeholder="Buscar componente: U4000, C2663…" value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setLimit(30); setOpen(true); }} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }} />
      {query && <button type="button" aria-label="Limpiar búsqueda de componentes" onClick={() => { setQuery(""); setOpen(false); }}><X size={14} /></button>}
    </form>
    {open && query.trim() && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl">
      {!results.length && <p className="p-3 text-sm">No se encontró ese componente.</p>}
      {results.slice(0, limit).map(part => <button type="button" key={part.id} className="flex w-full justify-between gap-3 rounded-md p-2 text-left text-sm hover:bg-accent" onClick={() => choose(part.id)}><strong>{part.name}</strong><span>{part.kind} · {part.pads.length} pads</span></button>)}
      {results.length > limit && <button type="button" className="sch-more" onClick={() => setLimit(value => value + 30)}>Ver más ({limit} de {results.length})</button>}
    </div>}
  </div>;
}
