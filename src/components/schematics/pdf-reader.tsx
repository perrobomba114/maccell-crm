"use client";
import { useEffect, useRef, useState } from "react";
import { clampPdfPage } from "@/lib/schematics/workspace";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Minus, Plus, Loader2 } from "lucide-react";

type ReferenceBox = { text: string; x: number; y: number; width: number; height: number };
type Props = { id: string; page: number; onPage(page: number): void; references: ReadonlySet<string>; selected: string; onReference(reference: string): void; onTextAvailable(available: boolean): void };
export default function PdfReader({ id, page, onPage, references, selected, onReference, onTextAvailable }: Props) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(500);
  const [boxes, setBoxes] = useState<ReferenceBox[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const passwordCallback = useRef<((password: string) => void) | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
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
      const viewport = pdfPage.getViewport({ scale: Math.min(4, width / native.width * zoom) });
      const element = canvas.current;
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.ceil(viewport.width * outputScale); element.height = Math.ceil(viewport.height * outputScale);
      element.style.width = `${viewport.width}px`; element.style.height = `${viewport.height}px`;
      setDimensions({ width: viewport.width, height: viewport.height });
      render = pdfPage.render({ canvas: element, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] });
      await render.promise;
      const text = await pdfPage.getTextContent();
      if (cancelled) return;
      onTextAvailable(text.items.some(item => "str" in item && item.str.trim().length > 0));
      const result: ReferenceBox[] = [];
      for (const item of text.items) {
        if (!("str" in item)) continue;
        const label = item.str.trim();
        if (label.length < 3 || !/[A-Za-z]/.test(label) || !references.has(label.toUpperCase())) continue;
        const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const height = Math.max(8, Math.hypot(item.transform[2], item.transform[3]) * viewport.scale);
        result.push({ text: label, x, y: y - height, width: Math.max(10, item.width * viewport.scale), height: height + 3 });
      }
      setBoxes(result); setBusy(false);
    }).catch((cause: unknown) => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "No se pudo renderizar la página"); setBusy(false); } });
    return () => { cancelled = true; render?.cancel(); };
  }, [document, page, width, zoom, references, onTextAvailable, onPage]);
  return <div className="sch-reader">
    <div className="sch-reader-toolbar"><button aria-label="Página anterior" disabled={page <= 1 || !document} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /></button>
      <label>Pág. <input aria-label="Página del PDF" type="number" min={1} max={document?.numPages ?? 1} value={page} onChange={(e) => { const value = Number(e.target.value); if (Number.isInteger(value) && value > 0 && value <= (document?.numPages ?? 1)) onPage(value); }} /> / {document?.numPages ?? "—"}</label>
      <button aria-label="Página siguiente" disabled={!document || page >= document.numPages} onClick={() => onPage(page + 1)}><ChevronRight size={15} /></button><div className="sch-spacer" />
      <button aria-label="Alejar PDF" onClick={() => setZoom((z) => Math.max(.5, z / 1.25))}><Minus size={14} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Acercar PDF" onClick={() => setZoom((z) => Math.min(6, z * 1.25))}><Plus size={14} /></button>
    </div>
    {passwordRequired && <form className="sch-pdf-password" onSubmit={(e) => { e.preventDefault(); passwordCallback.current?.(password); setPassword(""); setPasswordRequired(false); setBusy(true); }}><p>Este PDF está protegido. Ingresá su contraseña.</p><input aria-label="Contraseña del PDF" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="submit">Abrir</button></form>}
    {error && <div className="sch-notice" role="alert">No se pudo mostrar el PDF: {error}</div>}
    <div className="sch-reader-scroll" ref={container}>
      {busy && <div className="sch-reader-loading"><Loader2 size={17} className="animate-spin" />Cargando página…</div>}
      <div className="sch-reader-page" style={{ width: dimensions.width, height: dimensions.height }}><canvas ref={canvas} aria-label={`Página ${page} del esquema`} />
        {boxes.map((box, i) => <button className={`sch-pdf-reference ${box.text.toUpperCase() === selected.toUpperCase() ? "is-selected" : ""}`} key={i} title={`Localizar ${box.text} en la placa`} aria-label={`Localizar ${box.text} en la placa`} style={{ left: box.x, top: box.y, width: box.width, height: box.height }} onClick={() => onReference(box.text)} />)}
      </div>
    </div>
  </div>;
}
