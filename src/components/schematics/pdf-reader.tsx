"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clampPdfPage } from "@/lib/schematics/workspace";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Minus, Plus, Loader2, Maximize, ArrowLeftRight } from "lucide-react";

import { usePdfNavigation } from "./use-pdf-navigation";
import { fitPageZoom, pdfRasterScale } from "@/lib/schematics/navigation";

import { containsReference, readableReferenceZoom, referencesInText, validPdfBox, type PdfBox } from "@/lib/schematics/linked-navigation";
import { usePdfPageIndex } from "./use-pdf-page-index";
type Props = { toolbar?: ReactNode; id: string; page: number; onPage(page: number): void; references: ReadonlySet<string>; selected: string; onReference(reference: string, box: PdfBox): void; revision: number; focusBox?: PdfBox; focusToken: number; onTextAvailable(available: boolean): void };
export default function PdfReader({ toolbar, id, page, onPage, references, selected, onReference, onTextAvailable, revision, focusBox, focusToken }: Props) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(500);
  const [boxes, setBoxes] = useState<PdfBox[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, zoom: 1 });
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const pageIndex = usePdfPageIndex(id, page, revision);
  const [choices, setChoices] = useState<{ labels: string[]; box: PdfBox } | null>(null);
  const overlays = useMemo(() => (pageIndex?.boxes.length ? pageIndex.boxes : boxes).map(box => ({ box, labels: referencesInText(box.text, references), selected: containsReference(box.text, selected) })).filter(item => item.labels.length || item.selected), [pageIndex, boxes, references, selected]);
  const passwordCallback = useRef<((password: string) => void) | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const navigation = usePdfNavigation(container, dimensions, setZoom);
  useEffect(() => { container.current?.scrollTo(0, 0); setChoices(null); }, [id, page]);
  const focusKey = useRef('');
  useEffect(() => {
    if (busy || !container.current || !dimensions.width || dimensions.zoom !== zoom) return;
    const box = focusBox && containsReference(focusBox.text, selected) ? focusBox : overlays.find(item => item.selected)?.box;
    if (!box) return;
    const key = `${id}:${page}:${selected}:${focusToken}:${box.x}:${box.y}`;
    if (focusKey.current === key) return;
    const readableZoom = readableReferenceZoom(zoom, box.height, dimensions.height);
    if (readableZoom > zoom + .001) { setZoom(readableZoom); return; }
    focusKey.current = key;
    const element = container.current;
    element.scrollTo({ left: Math.max(0, (box.x + box.width / 2) * dimensions.width + Math.max(12, (element.clientWidth - dimensions.width) / 2) - element.clientWidth / 2), top: Math.max(0, (box.y + box.height / 2) * dimensions.height + 12 - element.clientHeight / 2) });
  }, [busy, dimensions, focusBox, focusToken, id, overlays, page, selected, zoom]);
  useEffect(() => {
    let cancelled = false; let destroy: (() => Promise<void>) | undefined;
    setBusy(true); setError(""); setDocument(null); setPasswordRequired(false);
    import("pdfjs-dist").then(async (pdfjs) => {
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = "/api/schematics/pdf-assets/build/pdf.worker.min.mjs";
      const task = pdfjs.getDocument({ url: `/api/schematics/${id}`, cMapUrl: "/api/schematics/pdf-assets/cmaps/", cMapPacked: true, standardFontDataUrl: "/api/schematics/pdf-assets/standard_fonts/", wasmUrl: "/api/schematics/pdf-assets/wasm/", useSystemFonts: true });
      destroy = () => task.destroy();
      task.onPassword = (callback: (value: string) => void) => { if (!cancelled) { passwordCallback.current = callback; setPasswordRequired(true); setBusy(false); } };
      const pdf = await task.promise;
      if (!cancelled) { setDocument(pdf); setPasswordRequired(false); }
    }).catch((cause: unknown) => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "No se pudo abrir el PDF"); setBusy(false); } });
    return () => { cancelled = true; passwordCallback.current = null; if (destroy) void destroy().catch((cause: unknown) => console.warn("[PDF] No se pudo liberar el documento", cause instanceof Error ? cause.message : "Error")); };
  }, [id]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width - 24)));
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document || !canvas.current) return;
    const actualPage = clampPdfPage(page, document.numPages);
    if (actualPage !== page) { onPage(actualPage); return; }
    let cancelled = false; let render: RenderTask | undefined;
    setBusy(true); setBoxes([]); setError("");
    document.getPage(clampPdfPage(page, document.numPages)).then(async (pdfPage) => {
      if (cancelled || !canvas.current) return;
      const native = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: width / native.width * zoom });
      const element = canvas.current;
      const outputScale = pdfRasterScale(viewport.width, viewport.height, window.devicePixelRatio || 1);
      element.width = Math.ceil(viewport.width * outputScale); element.height = Math.ceil(viewport.height * outputScale);
      element.style.width = `${viewport.width}px`; element.style.height = `${viewport.height}px`;
      setDimensions({ width: viewport.width, height: viewport.height, zoom });
      render = pdfPage.render({ canvas: element, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] });
      await render.promise;
      const text = await pdfPage.getTextContent();
      if (cancelled) return;
      onTextAvailable(text.items.some(item => "str" in item && item.str.trim().length > 0));
      const result: PdfBox[] = [];
      for (const item of text.items) {
        if (!("str" in item)) continue;
        const label = item.str.trim();
        if (!label) continue;
        const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const height = Math.hypot(item.transform[2], item.transform[3]) * viewport.scale;
        const box = { text: label, x: x / viewport.width, y: Math.max(0, y - height) / viewport.height, width: item.width * viewport.scale / viewport.width, height: height / viewport.height };
        if (validPdfBox(box)) result.push(box);
      }
      setBoxes(result); setBusy(false);
    }).catch((cause: unknown) => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "No se pudo renderizar la página"); setBusy(false); } });
    return () => { cancelled = true; render?.cancel(); };
  }, [document, page, width, zoom, onTextAvailable, onPage]);
  return <div className="sch-reader">
    <div className="sch-reader-toolbar">{toolbar}<button aria-label="Página anterior" disabled={page <= 1 || !document} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /></button>
      <label>Pág. <input aria-label="Página del PDF" type="number" min={1} max={document?.numPages ?? 1} value={page} onChange={(e) => { const value = Number(e.target.value); if (Number.isInteger(value) && value > 0 && value <= (document?.numPages ?? 1)) onPage(value); }} /> / {document?.numPages ?? "—"}</label>
      <button aria-label="Página siguiente" disabled={!document || page >= document.numPages} onClick={() => onPage(page + 1)}><ChevronRight size={15} /></button><div className="sch-spacer" />
      <button aria-label="Alejar PDF" onClick={() => navigation.zoomBy(1 / 1.25)}><Minus size={14} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Acercar PDF" onClick={() => navigation.zoomBy(1.25)}><Plus size={14} /></button>
      <button aria-label="Ajustar ancho del PDF" title="Ajustar ancho · 0" onClick={() => { setZoom(1); container.current?.scrollTo(0,0); }}><ArrowLeftRight size={16} /></button>
      <button aria-label="Ajustar página completa" disabled={!document || !dimensions.width} title="Ver página completa" onClick={() => { const el=container.current; if(el) { setZoom(fitPageZoom(dimensions.width,dimensions.height,el.clientWidth-24,el.clientHeight-24,zoom)); el.scrollTo(0,0); } }}><Maximize size={16} /></button>
    </div>
    {passwordRequired && <form className="sch-pdf-password" onSubmit={(e) => { e.preventDefault(); passwordCallback.current?.(password); setPassword(""); setPasswordRequired(false); setBusy(true); }}><p>Este PDF está protegido. Ingresá su contraseña.</p><input aria-label="Contraseña del PDF" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="submit">Abrir</button></form>}
    {error && <div className="sch-notice" role="alert">No se pudo mostrar el PDF: {error}</div>}
    {choices && <div className="sch-pdf-label-choices"><span>Elegí la referencia de esta zona:</span>{choices.labels.map(label => <button key={label} onClick={() => { onReference(label, choices.box); setChoices(null); }}>{label}</button>)}<button onClick={() => setChoices(null)}>Cerrar</button></div>}
    <div className="sch-reader-scroll" ref={container} tabIndex={0} aria-label="Área de navegación del PDF" title="Arrastrar para mover · Rueda para zoom · Shift + rueda para desplazar · + / − / 0 y flechas" {...navigation.handlers}>
      {busy && <div className="sch-reader-loading"><Loader2 size={17} className="animate-spin" />Cargando página…</div>}
      <div className="sch-reader-page" style={{ width: dimensions.width, height: dimensions.height }}><canvas ref={canvas} aria-label={`Página ${page} del esquema`} />
        {overlays.map(({ box, labels, selected: highlighted }, i) => <button className={`sch-pdf-reference ${highlighted ? "is-selected" : ""}`} key={i} disabled={!labels.length} title={labels.length ? `Localizar ${labels.join(", ")} en la placa${pageIndex?.source === "ocr" ? " · OCR: verificar imagen" : ""}` : box.text} aria-label={labels.length ? `Localizar ${labels.join(", ")} en la placa` : `Coincidencia ${selected}`} style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }} onClick={() => { if (labels.length === 1) onReference(labels[0], box); else setChoices({ labels, box }); }} />)}
      </div>
    </div>
  </div>;
}
