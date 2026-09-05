import type { SemanticIndexStatus } from '@/lib/schematics/semantic-status';

const labels: Record<SemanticIndexStatus['status'], string> = {
  not_configured: 'Falta configurar', unavailable: 'Estado no disponible', not_indexed: 'Todavía sin índice',
  empty: 'Sin páginas disponibles', processing: 'Indexando', partial: 'Requiere reintento', pending: 'Pendiente de indexar',
  idle: 'Páginas con vectores disponibles', stopped: 'Proceso detenido',
};

export function SemanticIndexStatusView({ status, showConfiguration }: { status: SemanticIndexStatus; showConfiguration: boolean }) {
  return <div role="status">
    <p><strong>Búsqueda semántica: {labels[status.status]}</strong></p>
    {status.indexablePages !== null && <p>
      {status.pagesWithVectors === null ? `${status.indexablePages} páginas indexables` : `${status.pagesWithVectors}/${status.indexablePages} páginas con vectores`}
      {status.currentChunks !== null && ` · ${status.currentChunks} fragmentos actuales`}
      {status.workerFailedPages !== null && status.workerFailedPages > 0 && ` · ${status.workerFailedPages} páginas con error en el último ciclo`}
    </p>}
    {status.status === 'not_configured' && <p style={{ overflowWrap: 'anywhere' }}>
      {showConfiguration ? `Configuración pendiente: ${status.missingKeys.join(', ')}.` : 'Un administrador debe completar la configuración.'}
    </p>}
    {status.status === 'unavailable' && <p>El estado RAG no pudo consultarse. El índice técnico sigue disponible.</p>}
    {status.pagesWithVectors !== null && status.pagesWithVectors > 0 && <p>Una página puede tener fragmentos pendientes. Solo se cuentan vectores del contenido y la versión actuales.</p>}
  </div>;
}
