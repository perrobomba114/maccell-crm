import type { SemanticIndexStatus } from '@/lib/schematics/semantic-status';

const labels: Record<SemanticIndexStatus['status'], string> = {
  not_configured: 'Falta configurar', unavailable: 'Estado no disponible', not_indexed: 'Todavía sin índice',
  empty: 'Sin páginas disponibles', processing: 'Indexando', partial: 'Requiere reintento', pending: 'Pendiente de indexar',
  idle: 'Páginas con vectores disponibles',
};

export function SemanticIndexStatusView({ status, showConfiguration }: { status: SemanticIndexStatus; showConfiguration: boolean }) {
  return <div role="status">
    <p><strong>Cerebro RAG: {labels[status.status]}</strong></p>
    {status.indexablePages !== null && <p>
      {status.pagesWithVectors === null ? `${status.indexablePages} páginas indexables` : `${status.pagesWithVectors}/${status.indexablePages} páginas con vectores`}
      {status.currentChunks !== null && ` · ${status.currentChunks} fragmentos actuales`}
      {status.workerFailedPages !== null && status.workerFailedPages > 0 && ` · ${status.workerFailedPages} páginas con error en RAG`}
    </p>}
    {status.matchedDocuments !== null && <p>{status.matchedDocuments}/{status.totalPdfDocuments} PDF vinculados por ruta y SHA · {status.readyDocuments} listos{status.failedDocuments ? ` · ${status.failedDocuments} documentos con error` : ''}.</p>}
    {status.activeModel && <p>Modelo activo: {status.activeModel} · {status.dimensions} dimensiones.</p>}
    {status.status === 'not_configured'  && <p style={{ overflowWrap: 'anywhere' }}>
      {showConfiguration ? `Configuración pendiente: ${status.missingKeys.join(', ')}.` : 'Un administrador debe completar la configuración.'}
    </p>}
    {status.status === 'unavailable' && <p>El estado RAG no pudo consultarse. El índice técnico sigue disponible.</p>}
    {status.pagesWithVectors !== null && status.pagesWithVectors > 0 && <p>Una página puede tener fragmentos pendientes. Se reutilizan los vectores de Cerebro del mismo PDF y modelo activo.</p>}
  </div>;
}
