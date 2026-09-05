"use client";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { PdfSearchNavigation, pdfSearchContext, pdfSearchRequest, type ManualPdfSearch } from "@/lib/schematics/pdf-search-navigation";
import { referenceOccurrences, type PdfBox } from "@/lib/schematics/linked-navigation";
import {useReferenceIndex} from './use-reference-index';
import { AssetIndexStatus } from "./asset-index-status";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";

const PdfReader = dynamic(() => import("./pdf-reader"), { ssr: false });
type Props = { asset: SchematicAsset; reference: string; references: ReadonlySet<string>; onReference(reference: string): void; page: number; onPage(page: number): void; navigationToken: number; canReindex: boolean };
export function PdfPanel({ asset, reference, references, onReference, page, onPage, navigationToken, canReindex }: Props) {
  const [matches, setMatches] = useState<{ page: number; excerpt: string; boxes?: PdfBox[] }[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [manualSearch, setManualSearch] = useState<ManualPdfSearch | null>(null);
  const [revision, setRevision] = useState(0);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [hasText, setHasText] = useState<boolean | null>(null);
  const preloaded=useReferenceIndex(asset.id,revision);
  const request = useMemo(() => pdfSearchRequest(asset.id, reference, navigationToken, manualSearch), [asset.id, reference, navigationToken, manualSearch]);
  const term = request.term;
  const [navigation] = useState(() => new PdfSearchNavigation());
  const [occurrence, setOccurrence] = useState(0);
  const [focus, setFocus] = useState<{ box?: PdfBox; page?: number; token: number }>({ token: 0 });
  const occurrences = referenceOccurrences(matches, term);
  useEffect(() => {
    const ticket = navigation.begin(request);
    const controller = new AbortController();
    const cleanup = () => { controller.abort(); navigation.cancel(ticket); };
    if (term.length < 2) { setMatches([]); setStatus(""); return cleanup; }
    const applyMatches = (data: { matches: { page: number; excerpt: string; boxes?: PdfBox[] }[]; status: string; sources?: string[] }) => {
      if (controller.signal.aborted || !navigation.isCurrent(ticket)) return;
      setMatches(data.matches);
      setOccurrence(current => Math.min(current, Math.max(0, referenceOccurrences(data.matches, term).length - 1)));
      const navigate = navigation.accept(ticket, data.matches.length > 0);
      if (data.matches.length) {
        if (navigate) {
          onPage(data.matches[0].page); setOccurrence(0);
          setFocus(current => ({ box: referenceOccurrences(data.matches, term)[0]?.box, page: data.matches[0].page, token: current.token + 1 }));
        }
        setStatus(`${data.matches.length} páginas con ${term}${data.sources?.includes("ocr") ? " · incluye texto OCR" : ""}`);
      } else setStatus(data.status === "indexed" ? `Sin coincidencias exactas para ${term}` : data.status === "no_text" ? "PDF sin texto extraíble: podés reconocer la página con OCR." : "Este PDF todavía no tiene un índice consultable.");
    };
    if (preloaded?.complete && /^[A-Za-z0-9_]+$/.test(term)) {
      applyMatches({ matches: preloaded.lookup.get(term) ?? [], status: "indexed" });
      return cleanup;
    }
    setStatus("Buscando referencia…"); setMatches([]);
    fetch(`/api/schematics/${asset.id}/references?q=${encodeURIComponent(term)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("No se pudo consultar el índice");
      applyMatches(await response.json());
    }).catch((error: unknown) => { if (!controller.signal.aborted && navigation.isCurrent(ticket)) setStatus(error instanceof Error ? error.message : "Error de búsqueda"); });
    return cleanup;
  }, [asset.id, term, request, revision, onPage, navigation, preloaded]);
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
  function visit(index: number) {
    const item = occurrences[index]; if (!item) return;
    if(references.has(term.toUpperCase())){navigation.preservePdfSelection(term,navigationToken);onReference(term.toUpperCase());}
    setOccurrence(index); onPage(item.page); setFocus(current => ({ box: item.box, page: item.page, token: current.token + 1 }));
  }
  const url = `/api/schematics/${asset.id}#page=${page}&search=${encodeURIComponent(term)}&view=FitH`;
  return <section className="sch-pdf">
    <PdfReader id={asset.id} page={page} onPage={onPage} selected={term} revision={revision} focusBox={focus.page === page ? focus.box : undefined} focusToken={focus.token} references={references} onReference={(label, box) => { navigation.preservePdfSelection(label, navigationToken); setFocus(current => ({ box, page, token: current.token + 1 })); onReference(label); }} onTextAvailable={setHasText} toolbar={<>
      <form className="sch-pdf-search" onSubmit={event => { event.preventDefault(); setManualSearch(current => ({ context: pdfSearchContext(asset.id, reference, navigationToken), term: query.trim(), sequence: (current?.sequence ?? 0) + 1 })); }}><input aria-label="Buscar texto en este PDF" placeholder="Buscar referencia o texto…" value={query} minLength={2} maxLength={100} onChange={event => setQuery(event.target.value)} /><button aria-label="Buscar en PDF" disabled={query.trim().length < 2}><Search size={15} /></button></form>
      <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir PDF en otra pestaña"><ExternalLink size={15} /></a>
    </>} />
    {term && <div className="sch-references"><div role="status"><Link2 size={13} />{status}</div>{occurrences.length > 0 && <><button aria-label="Referencia anterior" disabled={occurrence <= 0} onClick={() => visit(occurrence - 1)}>←</button><span>{occurrence + 1}/{occurrences.length}</span><button aria-label="Referencia siguiente" disabled={occurrence >= occurrences.length - 1} onClick={() => visit(occurrence + 1)}>→</button></>}{occurrences.map((match, index) => <button key={`${match.page}:${match.index}`} aria-pressed={page === match.page && index === occurrence} onClick={() => visit(index)}>Pág. {match.page}{match.box ? ` · ${match.index + 1}` : " · sin coordenadas"}</button>)}</div>}
    <details className="sch-ocr-tools"><summary>Estado e indexación del archivo</summary><AssetIndexStatus asset={asset} canReindex={canReindex} onUpdated={() => setRevision(value => value + 1)} /></details>
    <details className="sch-ocr-tools"><summary>{hasText === false ? "Página sin texto seleccionable" : "Reconocimiento de texto (OCR)"}</summary><p>Reconocé la página actual para buscar referencias. El PDF original se conserva.</p><button disabled={ocrBusy || asset.status !== "ready"} onClick={() => void recognizePage()}>{ocrBusy ? "Reconociendo página…" : `Reconocer página ${page}`}</button>{ocrMessage && <p role="status">{ocrMessage}</p>}</details>
  </section>;
}
