"use client";
import { useDeferredValue, useEffect, useState } from "react";
import { Search, Star, History, Loader2, X, CircuitBoard, FileText, Library } from "lucide-react";
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
  const [loadedQuery, setLoadedQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const query = useDeferredValue(props.search);
  useEffect(() => { setPage(1); }, [query]);
  const ids = scope === "favorites" ? props.favorites.join(",") : "";
  useEffect(() => {
    if (scope === "favorites" && !ids) { setResult({ ...props.initial, assets: [], total: 0 }); setLoadedQuery(query); setBusy(false); setError(""); return; }
    const controller = new AbortController();
    setBusy(true); setError("");
    const params = new URLSearchParams({ q: query, kind, page: String(page), pageSize: "40" });
    if (ids) params.set("ids", ids);
    fetch(`/api/schematics/catalog?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("No se pudo cargar la biblioteca. Reintentá la búsqueda.");
      const data = await response.json() as CatalogPage;
      if (!controller.signal.aborted) { setResult(data); setLoadedQuery(query); }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Error al buscar"); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [query, kind, page, ids, scope, props.initial, retry]);
  return <aside className="sch-library" aria-label="Biblioteca de esquemáticos">
    <div className="sch-section-heading">Biblioteca <span>{result.total} archivos</span></div>
    <label className="sch-search"><Search size={15} /><input aria-label="Buscar en biblioteca" placeholder="Buscar modelo o placa…" value={props.search} onChange={event => { setPage(1); props.onSearch(event.target.value); }} />{props.search && <button aria-label="Limpiar búsqueda" onClick={() => { setPage(1); props.onSearch(""); }}><X size={15} /></button>}</label>
    <div className="sch-kind-tabs" role="group" aria-label="Tipo de archivo">
      {([{ value: "all", label: "Todos", icon: Library }, { value: "pcbe", label: "Placas", icon: CircuitBoard }, { value: "pdf", label: "PDF", icon: FileText }] as const).map(({ value, label, icon: Icon }) => <button key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setPage(1); }}><Icon size={14} />{label}</button>)}
    </div>
    <div className="sch-library-filters">
      <button aria-label="Mostrar favoritos" aria-pressed={scope === "favorites"} onClick={() => { setScope(scope === "all" ? "favorites" : "all"); setPage(1); }}><Star size={14} /> Favoritos <span>{props.favorites.length}</span></button>
      {(kind !== "all" || scope !== "all" || props.search) && <button onClick={() => { setKind("all"); setScope("all"); setPage(1); props.onSearch(""); }}>Restablecer</button>}
    </div>
    {busy && <p className="sch-library-status" role="status"><Loader2 size={14} className="animate-spin" /> Buscando…</p>}
    {error && <p className="sch-notice" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Reintentar</button></p>}
    <div className="sch-tree" aria-busy={busy}>
      {scope === "all" && kind === "all" && !query && props.recent.length > 0 && <details open className="sch-folder"><summary><History size={15} />Recientes</summary>{props.recent.map(item => <button key={item.id} className="sch-asset" onClick={() => props.onOpenId(item.id)}>{item.name}</button>)}</details>}
      {!busy && !error && result.total === 0 && <div className="sch-library-empty"><Search size={24} /><strong>{scope === "favorites" ? "Sin favoritos para mostrar" : "No encontramos ese equipo"}</strong><p>{scope === "favorites" ? "Marcá la estrella de un documento abierto para guardarlo acá, o revisá los filtros." : "Probá con otro modelo o código de placa y revisá el tipo de archivo."}</p></div>}
      {!busy && !error && result.assets.length > 0 && loadedQuery === props.search && <AssetTree assets={result.assets} boardId={props.boardId} pdfId={props.pdfId} onOpen={props.onOpen} expanded={!!query || scope === "favorites"} />}
    </div>
    <div className="sch-library-pagination"><button disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>Anterior</button><span>{page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}</span><button disabled={page * result.pageSize >= result.total || busy} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>
    <LibraryIndexStatus canReindex={props.canReindex} />
    <div className="sch-library-foot">Favoritos y recientes se guardan para tu usuario en este navegador.</div>
  </aside>;
}
