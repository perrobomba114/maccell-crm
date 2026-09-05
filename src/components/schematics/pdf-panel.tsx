"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, ExternalLink, Link2, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { shouldNavigateReference } from "@/lib/schematics/workspace";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";

const PdfReader = dynamic(() => import("./pdf-reader"), { ssr: false });
type Props = { asset: SchematicAsset; reference: string; references: ReadonlySet<string>; onReference(reference: string): void; page: number; onPage(page: number): void; navigationToken: number };
export function PdfPanel({ asset, reference, references, onReference, page, onPage, navigationToken }: Props) {
  const [matches, setMatches] = useState<{ page: number; excerpt: string }[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [hasText, setHasText] = useState<boolean | null>(null);
  const term = manualSearch || reference;
  const lastNavigation = useRef(navigationToken);
  const lastManual = useRef("");
  useEffect(() => { setManualSearch(""); }, [reference]);
  useEffect(() => {
    if (term.length < 2) { setMatches([]); setStatus(""); return; }
    const navigate = shouldNavigateReference(lastNavigation.current, navigationToken, lastManual.current, manualSearch);
    lastNavigation.current = navigationToken; lastManual.current = manualSearch;
    const controller = new AbortController(); setStatus("Buscando referencia…"); setMatches([]);
    fetch(`/api/schematics/${asset.id}/references?q=${encodeURIComponent(term)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("No se pudo consultar el índice");
      const data = await response.json() as { matches: { page: number; excerpt: string }[]; status: string; sources?: string[] };
      if (controller.signal.aborted) return;
      setMatches(data.matches);
      if (data.matches.length) { if (navigate) onPage(data.matches[0].page); setStatus(`${data.matches.length} páginas con ${term}${data.sources?.includes("ocr") ? " · incluye texto OCR" : ""}`); }
      else setStatus(data.status === "indexed" ? `Sin coincidencias exactas para ${term}` : data.status === "no_text" ? "PDF sin texto extraíble: podés reconocer la página con OCR." : "Este PDF todavía no tiene un índice consultable.");
    }).catch((error: unknown) => { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : "Error de búsqueda"); });
    return () => controller.abort();
  }, [asset.id, term, revision, onPage, navigationToken, manualSearch]);
  async function recognizePage() {
    setOcrBusy(true); setOcrMessage("");
    try {
      const response = await fetch(`/api/schematics/${asset.id}/ocr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages: [page] }) });
      const data = await response.json() as { error?: string; pages?: { characters: number }[]; languageFallback?: boolean; languages?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo reconocer la página");
      setOcrMessage(data.pages?.some(item => item.characters > 0) ? `Página ${page} indexada con OCR${data.languageFallback ? ` (${data.languages ?? "inglés"})` : ""}. Verificá las referencias en la imagen original.` : "No se reconoció texto legible en esta página.");
      setRevision(value => value + 1);
    } catch (error) { setOcrMessage(error instanceof Error ? error.message : "Falló el reconocimiento"); }
    finally { setOcrBusy(false); }
  }
  const url = `/api/schematics/${asset.id}#page=${page}&search=${encodeURIComponent(term)}&view=FitH`;
  return <section className="sch-pdf">
    <div className="sch-board-tools"><FileText size={14} /><span>ESQUEMA PDF</span><div className="sch-spacer" /><a href={url} target="_blank" rel="noreferrer" aria-label="Abrir PDF en otra pestaña"><ExternalLink size={15} /></a></div>
    <div className="sch-pdf-title" title={asset.name}>{asset.name}</div>
    <form className="sch-pdf-search" onSubmit={event => { event.preventDefault(); setManualSearch(query.trim()); setRevision(value => value + 1); }}><input aria-label="Buscar texto en este PDF" placeholder="Referencia o texto exacto…" value={query} minLength={2} maxLength={100} onChange={event => setQuery(event.target.value)} /><button aria-label="Buscar en PDF" disabled={query.trim().length < 2}><Search size={15} /></button></form>
    <PdfReader id={asset.id} page={page} onPage={onPage} selected={term} references={references} onReference={onReference} onTextAvailable={setHasText} />
    {term && <div className="sch-references"><div role="status"><Link2 size={13} />{status}</div>{matches.map(match => <button key={match.page} title={match.excerpt} aria-pressed={page === match.page} onClick={() => onPage(match.page)}>Pág. {match.page}</button>)}</div>}
    <details className="sch-ocr-tools" open={hasText === false}><summary>{hasText === false ? "Página sin texto seleccionable" : "Reconocimiento de texto (OCR)"}</summary><p>Reconocé la página actual para buscar referencias. El PDF original se conserva.</p><button disabled={ocrBusy || asset.status !== "ready"} onClick={() => void recognizePage()}>{ocrBusy ? "Reconociendo página…" : `Reconocer página ${page}`}</button>{ocrMessage && <p role="status">{ocrMessage}</p>}</details>
  </section>;
}
