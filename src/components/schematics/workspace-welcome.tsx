import { CircuitBoard, FileText, Library } from "lucide-react";

type Props = {
  isLibraryOpen?: boolean;
  onBrowse(): void;
};

export function WorkspaceWelcome({ isLibraryOpen = true, onBrowse }: Props) {
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

    </section>
  );
}
