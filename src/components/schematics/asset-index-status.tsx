"use client";
import { useEffect, useState } from 'react';
import type { SchematicAsset } from '@/lib/schematics/catalog-types';

type IndexInfo = { status: string; pages?: number; components?: number; nets?: number; error?: string; jobStatus?: string };
const labels: Record<string, string> = { partial: 'Índice parcial', indexed: 'Índice disponible', not_indexed: 'Sin indexar', stale: 'Índice desactualizado', failed: 'Indexación fallida', pending: 'En cola', processing: 'Procesando' };
export function AssetIndexStatus({ asset, canReindex, onUpdated }: { asset: SchematicAsset; canReindex: boolean; onUpdated?(): void }) {
  const [info, setInfo] = useState<IndexInfo | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/schematics/${asset.id}/index`, { signal: controller.signal }).then(async response => {
      const data = await response.json() as IndexInfo;
      if (!response.ok) throw new Error(data.error ?? 'No se pudo consultar el índice');
      if (!controller.signal.aborted) { setInfo(data); setError(''); }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Error de índice'); });
    return () => controller.abort();
  }, [asset.id, revision]);
  async function enqueue() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/schematics/${asset.id}/index`, { method: 'POST' });
      const data = await response.json() as IndexInfo;
      if (!response.ok) throw new Error(data.error ?? 'No se pudo encolar la indexación');
      setInfo(data); setRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error al indexar'); }
    finally { setBusy(false); }
  }
  return <div className="sch-index-status"><strong>{asset.kind === 'pdf' ? 'Índice del PDF' : 'Índice de placa'}</strong><span role="status">{error || (info ? labels[info.status] ?? info.status : 'Consultando índice…')}{info?.jobStatus && ` · ${labels[info.jobStatus] ?? info.jobStatus}`}</span>
    {info?.error && <p role="alert">{info.error}</p>}{info?.pages !== undefined && <small>{info.pages} páginas · {info.components ?? 0} componentes · {info.nets ?? 0} redes</small>}
    <div><button onClick={() => { setRevision(value => value + 1); onUpdated?.(); }}>Actualizar estado</button>{canReindex && <button disabled={busy || asset.status !== 'ready' || ['pending', 'processing'].includes(info?.jobStatus ?? info?.status ?? '')} onClick={() => void enqueue()}>{busy ? 'Encolando…' : 'Reindexar archivo'}</button>}</div>
  </div>;
}
