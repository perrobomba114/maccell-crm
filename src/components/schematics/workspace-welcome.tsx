import { ArrowUpRight, CircuitBoard, FileText, History, Search } from "lucide-react";

type Props = {
  search: string;
  onSearch(value: string): void;
  onBrowse(): void;
  recent: { id: string; name: string }[];
  onOpen(id: string): void;
};

export function WorkspaceWelcome({ search, onSearch, onBrowse, recent, onOpen }: Props) {
  return <section className="sch-start" aria-label="Empezar una consulta técnica">
    <div className="sch-start-icon"><CircuitBoard size={28} strokeWidth={1.5} /></div>
    <span className="sch-start-eyebrow">MESA DE TRABAJO</span>
    <h2>¿Qué equipo estás reparando?</h2>
    <p>Encontrá la placa o el manual por modelo, código de placa o referencia.</p>
    <form className="sch-start-search" onSubmit={event => { event.preventDefault(); onBrowse(); }}>
      <Search size={19} />
      <input aria-label="Buscar equipo" placeholder="Ej. iPhone 13, SM-A125M…" value={search} onChange={event => onSearch(event.target.value)} />
      <button type="submit">Buscar</button>
    </form>
    <div className="sch-start-guide">
      <div><CircuitBoard size={18} /><strong>Placa interactiva</strong><span>Ubicá componentes, conexiones y capas.</span></div>
      <div><FileText size={18} /><strong>Documentación PDF</strong><span>Consultá esquemas y guías de diagnóstico.</span></div>
    </div>
    {recent.length > 0 && <div className="sch-start-recent">
      <h3><History size={15} /> Retomar una consulta</h3>
      {recent.slice(0, 3).map(item => <button key={item.id} onClick={() => onOpen(item.id)}><span>{item.name.replace(/\.(pcbe|pdf)$/i, "")}</span><ArrowUpRight size={16} /></button>)}
    </div>}
  </section>;
}
