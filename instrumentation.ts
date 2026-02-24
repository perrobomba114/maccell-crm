/**
 * Next.js Instrumentation — Cerebro RAG Auto-Setup
 * Se ejecuta una sola vez al arrancar el servidor Next.js.
 * Indexa reparaciones pendientes en pgvector en background.
 */

export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { indexPendingRepairs } = await import('@/lib/cerebro-indexer');

    // Background — no bloquea el arranque del servidor
    setTimeout(() => {
        indexPendingRepairs().catch((err: Error) =>
            console.error('[CEREBRO_INDEXER] Error en startup:', err.message)
        );
    }, 10_000); // 10s para que la DB esté lista
}
