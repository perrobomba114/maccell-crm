"use client";
import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  // Debounce search query by 250ms to eliminate rapid requests and UI flickering
  const [debouncedQuery, setDebouncedQuery] = useState(props.search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(props.search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [props.search]);

  const ids = scope === "favorites" ? props.favorites.join(",") : "";
  const firstResult = result.total === 0 ? 0 : (page - 1) * result.pageSize + 1;
  const lastResult = Math.min(page * result.pageSize, result.total);

  useEffect(() => {
    if (scope === "favorites" && !ids) {
      setResult({ ...props.initial, assets: [], total: 0 });
      setBusy(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    setBusy(true);
    setError("");

    const params = new URLSearchParams({ q: debouncedQuery, kind, page: String(page), pageSize: "100" });
    if (ids) params.set("ids", ids);

    fetch(`/api/schematics/catalog?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar la biblioteca. Reintentá la búsqueda.");
        const data = (await response.json()) as CatalogPage;
        if (!controller.signal.aborted) {
          setResult(data);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Error al buscar");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, kind, page, ids, scope, props.initial, retry]);

  return (
    <aside className="sch-library" aria-label="Biblioteca de esquemáticos">
      <div className="sch-section-heading">
        Biblioteca <span>{result.total} archivos</span>
      </div>

      <label className="sch-search">
        {busy ? <Loader2 size={15} className="animate-spin text-primary shrink-0" /> : <Search size={15} className="shrink-0" />}
        <input
          aria-label="Buscar en biblioteca"
          placeholder="Buscar modelo o placa…"
          value={props.search}
          onChange={(event) => {
            props.onSearch(event.target.value);
          }}
        />
        {props.search && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              setPage(1);
              props.onSearch("");
            }}
          >
            <X size={15} />
          </button>
        )}
      </label>

      <div className="sch-kind-tabs" role="group" aria-label="Tipo de archivo">
        {(
          [
            { value: "all", label: `Todos (${result.total})`, icon: Library },
            { value: "pcbe", label: `Placas (${result.counts.pcbe})`, icon: CircuitBoard },
            { value: "pdf", label: `PDF (${result.counts.pdf})`, icon: FileText },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setPage(1);
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="sch-library-filters">
        <button
          aria-label="Mostrar favoritos"
          aria-pressed={scope === "favorites"}
          onClick={() => {
            setScope(scope === "all" ? "favorites" : "all");
            setPage(1);
          }}
        >
          <Star size={14} /> Favoritos <span>{props.favorites.length}</span>
        </button>
        {(kind !== "all" || scope !== "all" || props.search) && (
          <button
            onClick={() => {
              setKind("all");
              setScope("all");
              setPage(1);
              props.onSearch("");
            }}
          >
            Restablecer
          </button>
        )}
      </div>

      {error && (
        <p className="sch-notice" role="alert">
          {error} <button onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
        </p>
      )}

      <div className={`sch-tree transition-opacity duration-200 ${busy ? "opacity-70" : "opacity-100"}`} aria-busy={busy}>
        {scope === "all" && kind === "all" && !debouncedQuery && props.recent.length > 0 && (
          <details open className="sch-folder select-none">
            <summary className="flex items-center gap-2">
              <History size={15} />
              <span>Recientes</span>
            </summary>
            <div className="sch-folder-children pl-2 ml-1.5 border-l border-border/50">
              {props.recent.map((item) => (
                <button key={item.id} className="sch-asset" onClick={() => props.onOpenId(item.id)}>
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </details>
        )}

        {!busy && !error && result.total === 0 && (
          <div className="sch-library-empty">
            <Search size={24} />
            <strong>{scope === "favorites" ? "Sin favoritos para mostrar" : "No encontramos ese equipo"}</strong>
            <p>
              {scope === "favorites"
                ? "Marcá la estrella de un documento abierto para guardarlo acá, o revisá los filtros."
                : "Probá con otro modelo o código de placa y revisá el tipo de archivo."}
            </p>
          </div>
        )}

        {result.assets.length > 0 && (
          <AssetTree
            assets={result.assets}
            boardId={props.boardId}
            pdfId={props.pdfId}
            onOpen={props.onOpen}
            expanded={!!props.search || scope === "favorites"}
          />
        )}
      </div>

      <div className="sch-library-pagination">
        <button disabled={page <= 1 || busy} onClick={() => setPage((value) => value - 1)}>
          Anterior
        </button>
        <span>
          Mostrando {firstResult}–{lastResult} de {result.total}
        </span>
        <button disabled={page * result.pageSize >= result.total || busy} onClick={() => setPage((value) => value + 1)}>
          Siguiente
        </button>
      </div>

      <LibraryIndexStatus canReindex={props.canReindex} />
      <div className="sch-library-foot">Favoritos y recientes se guardan para tu usuario en este navegador.</div>
    </aside>
  );
}
