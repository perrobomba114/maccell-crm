import { ArrowUpRight, CircuitBoard, FileText, History, Library } from "lucide-react";

type Props = {
  isLibraryOpen?: boolean;
  onBrowse(): void;
  recent: { id: string; name: string }[];
  onOpen(id: string): void;
};

export function WorkspaceWelcome({ isLibraryOpen = true, onBrowse, recent, onOpen }: Props) {
  return (
    <section className="sch-start" aria-label="Empezar una consulta técnica">
      <div className="sch-start-icon">
        <CircuitBoard size={28} strokeWidth={1.5} />
      </div>
      <span className="sch-start-eyebrow">MESA DE TRABAJO TÉCNICA</span>
      <h2>¿Qué equipo estás reparando?</h2>
      <p>
        {isLibraryOpen
          ? "Seleccioná un esquemático o placa desde el árbol de la biblioteca en el panel izquierdo."
          : "Abrí la biblioteca de esquemáticos para explorar placas interactivas y documentación técnica."}
      </p>

      {!isLibraryOpen && (
        <button
          type="button"
          onClick={onBrowse}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm my-2"
        >
          <Library size={16} />
          Abrir biblioteca de esquemáticos
        </button>
      )}

      <div className="sch-start-guide">
        <div>
          <CircuitBoard size={18} />
          <strong>Placa interactiva (.pcbe)</strong>
          <span>Ubicá componentes, conexiones, vías y capas en el visor de circuito.</span>
        </div>
        <div>
          <FileText size={18} />
          <strong>Documentación PDF</strong>
          <span>Consultá esquemas, diagramas de bloques y referencias sincronizadas.</span>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="sch-start-recent">
          <h3>
            <History size={15} /> Retomar una consulta reciente
          </h3>
          <div className="flex flex-col gap-2 mt-2">
            {recent.slice(0, 5).map((item) => {
              const isPcbe = item.name.toLowerCase().endsWith(".pcbe");
              const isPdf = item.name.toLowerCase().endsWith(".pdf");
              return (
                <button
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/60 hover:border-border transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {isPcbe ? (
                      <CircuitBoard size={16} className="text-emerald-500 shrink-0" />
                    ) : isPdf ? (
                      <FileText size={16} className="text-amber-500 shrink-0" />
                    ) : (
                      <CircuitBoard size={16} className="text-primary shrink-0" />
                    )}
                    <span className="font-medium text-foreground text-sm truncate">
                      {item.name.replace(/\.(pcbe|pdf)$/i, "")}
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {isPcbe ? "Placa" : isPdf ? "PDF" : "Archivo"}
                    </span>
                  </div>
                  <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

