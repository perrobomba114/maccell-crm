"use client";
import { useDeferredValue, useEffect, useState } from "react";
import { Search, Star, History, Loader2 } from "lucide-react";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";
import { LibraryIndexStatus } from "./library-index-status";
import { AssetTree } from "./asset-tree";

export type CatalogPage = { assets: SchematicAsset[]; total: number; page: number; pageSize: number; counts: { pcbe: number; pdf: number } };
type Props = {
  canReindex: boolean; initial: CatalogPage; search: string; onSearch(value: string): void;
  boardId?: string; pdfId?: string; onOpen(asset: SchematicAsset): void; onOpenId(id: string): void;
  favorites: string[]; recent: { id: string; name: string }[];
};
export function LibrarySidebar(props: Props) {
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState("all");
  const [result, setResult] = useState(props.initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useDeferredValue(props.search);
  const ids = scope === "favorites" ? props.favorites.join(",") : "";
  useEffect(() => {
    if (scope === "favorites" && !ids) { setResult({ ...props.initial, assets: [], total: 0 }); return; }
    const controller = new AbortController();
    setBusy(true); setError("");
    const params = new URLSearchParams({ q: query, kind, page: String(page), pageSize: "40" });
    if (ids) params.set("ids", ids);
    fetch(`/api/schematics/catalog?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("No se pudo cargar la biblioteca. Reintentá la búsqueda.");
      const data = await response.json() as CatalogPage;
      if (!controller.signal.aborted) setResult(data);
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Error al buscar"); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [query, kind, page, ids, scope, props.initial]);
  return <aside className="sch-library" aria-label="Biblioteca de esquemáticos">
    <div className="sch-section-heading">BIBLIOTECA <span>{result.total}</span></div>
    <label className="sch-search"><Search size={15} /><input aria-label="Buscar en biblioteca" placeholder="Modelo, código de placa o alias…" value={props.search} onChange={event => { setPage(1); props.onSearch(event.target.value); }} /></label>
    <div className="sch-library-filters">
      <select aria-label="Tipo de archivo" value={kind} onChange={event => { setKind(event.target.value); setPage(1); }}><option value="all">Placas y PDF</option><option value="pcbe">Placas</option><option value="pdf">PDF</option></select>
      <button aria-label="Mostrar favoritos" aria-pressed={scope === "favorites"} onClick={() => { setScope(scope === "all" ? "favorites" : "all"); setPage(1); }}><Star size={15} /> Favoritos</button>
    </div>
    {busy && <p className="sch-library-status" role="status"><Loader2 size={14} className="animate-spin" /> Buscando…</p>}
    {error && <p className="sch-notice" role="alert">{error}</p>}
    <div className="sch-tree" aria-busy={busy}>
      {scope === "all" && !query && props.recent.length > 0 && <details className="sch-folder"><summary><History size={15} />Recientes</summary>{props.recent.map(item => <button key={item.id} className="sch-asset" onClick={() => props.onOpenId(item.id)}>{item.name}</button>)}</details>}
      <AssetTree assets={result.assets} boardId={props.boardId} pdfId={props.pdfId} onOpen={props.onOpen} expanded={!!query || scope === "favorites"} />
    </div>
    <div className="sch-library-pagination"><button disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>Anterior</button><span>{page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}</span><button disabled={page * result.pageSize >= result.total || busy} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>
    <LibraryIndexStatus canReindex={props.canReindex} />
    <div className="sch-library-foot">Favoritos y recientes se guardan para tu usuario en este navegador.</div>
  </aside>;
}
