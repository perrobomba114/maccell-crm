"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { selectionLayers } from "@/lib/schematics/workspace";
import { initialLayer, workshopGeometry, type BoardDetail } from "@/lib/schematics/visibility";
import { BoardSearch } from "./board-search";
import { LayerControls } from "./layer-controls";
import { Maximize, Minus, Plus, RotateCcw } from "lucide-react";
import { hitTestCandidates } from "@/lib/schematics/boardview";
import type { PcbeDocument } from "@/lib/schematics/types";
import { boundsFor, renderBoard, transformFor, type View } from "./board-renderer";

type Props = { board: PcbeDocument; component: string | null; net: number | null; onSelect(component: string | null, net: number | null): void; focusToken: number };
export default function BoardCanvas({ board, component, net, onSelect, focusToken }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [size, setSize] = useState(0);
  const [layers, setLayers] = useState(() => new Set([initialLayer(board.geometry)]));
  const [detail, setDetail] = useState<BoardDetail>("clean");
  const [vias, setVias] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const visibleGeometry = useMemo(() => workshopGeometry(board.geometry, layers, detail, vias), [board, layers, detail, vias]);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const bounds = useMemo(() => boundsFor(board.geometry), [board]);
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(() => setSize((v) => v + 1));
    observer.observe(canvas.current); return () => observer.disconnect();
  }, []);
  useEffect(() => { if (canvas.current) renderBoard(canvas.current, board, bounds, view, layers, component, net, detail, vias); }, [board, bounds, view, layers, component, net, size, detail, vias]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left, py = event.clientY - rect.top;
      setView((current) => {
        const t = transformFor(rect.width, rect.height, bounds, current);
        const point = t.inverse(px, py);
        const next = { ...current, zoom: Math.max(.2, Math.min(100, current.zoom * Math.exp(-event.deltaY * .002))) };
        const nt = transformFor(rect.width, rect.height, bounds, next);
        return { ...next, x: next.x + px - nt.x(point.x), y: next.y + py - nt.y(point.y) };
      });
    };
    element.addEventListener("wheel", wheel, { passive: false }); return () => element.removeEventListener("wheel", wheel);
  }, [bounds]);
  function focusSelection() {
    const geometry = board.geometry.filter((p) => component ? "componentId" in p && p.componentId === component : net !== null && "netIndex" in p && p.netIndex === net);
    if (!geometry.length || !canvas.current) return;
    setLayers(current => new Set(selectionLayers(board.components, component, net, [...current])));
    const b = boundsFor(geometry), width = canvas.current.clientWidth, height = canvas.current.clientHeight;
    const base = transformFor(width, height, bounds, { zoom: 1, x: 0, y: 0 });
    const zoom = Math.max(1, Math.min(45, Math.min(width * .55 / Math.max(1, b.maxX - b.minX), height * .55 / Math.max(1, b.maxY - b.minY)) / base.scale));
    const t = transformFor(width, height, bounds, { zoom, x: 0, y: 0 });
    setView({ zoom, x: width / 2 - t.x((b.minX + b.maxX) / 2), y: height / 2 - t.y((b.minY + b.maxY) / 2) });
  }
  const pendingSearch = useRef<string | null>(null);
  useEffect(() => {
    if (pendingSearch.current !== component) return;
    pendingSearch.current = null;
    if (component) focusSelection();
  });
  const lastFocus = useRef(focusToken);
  useEffect(() => {
    if (lastFocus.current === focusToken) return;
    lastFocus.current = focusToken;
    focusSelection();
  });
  return <div className="sch-board">
    <div className="sch-board-tools">
      <BoardSearch components={board.components} onSelect={id => {
        const part = board.components.find(item => item.id === id);
        const layer = part?.pads[0]?.layer;
        if (layer !== undefined) setLayers(new Set([layer]));
        pendingSearch.current = id;
        onSelect(id, null);
        if (id === component) focusSelection();
      }} />
      <div className="sch-spacer" />
      <button title="Alejar" aria-label="Alejar" onClick={() => setView((v) => ({ ...v, zoom: Math.max(.2, v.zoom / 1.4) }))}><Minus size={15} /></button>
      <span className="sch-zoom">{Math.round(view.zoom * 100)}%</span>
      <button title="Acercar" aria-label="Acercar" onClick={() => setView((v) => ({ ...v, zoom: Math.min(100, v.zoom * 1.4) }))}><Plus size={15} /></button>
      <button title="Ajustar placa" aria-label="Ajustar placa" onClick={() => setView({ zoom: 1, x: 0, y: 0 })}><Maximize size={15} /></button>
      <button title="Centrar selección" onClick={focusSelection} disabled={!component && net === null}>Centrar</button>
      <button title="Limpiar selección" aria-label="Limpiar selección" onClick={() => onSelect(null, null)}><RotateCcw size={15} /></button>
    </div>
    <div className="sch-canvas-wrap"><canvas ref={canvas} aria-label={`Placa ${board.name}`} tabIndex={0}
      onKeyDown={(event) => { if (event.key === "Escape") onSelect(null, null); if (event.key.toLowerCase() === "f") focusSelection(); }}
      onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, view, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { const d = drag.current; if (!d) return; const dx = event.clientX - d.x, dy = event.clientY - d.y; if (Math.hypot(dx, dy) > 4) d.moved = true; if (d.moved) setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy }); }}
      onPointerUp={(event) => {
        if (drag.current && !drag.current.moved) {
          const rect = event.currentTarget.getBoundingClientRect(), t = transformFor(rect.width, rect.height, bounds, view);
          const p = t.inverse(event.clientX - rect.left, event.clientY - rect.top);
          const hit = hitTestCandidates(visibleGeometry, p, { tolerance: 7 / t.scale, visibleLayerIds: new Set(visibleGeometry.map(item => item.layer)) })[0];
          onSelect(hit?.componentId ?? null, hit?.netId ?? null);
        }
        drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId);
      }} onPointerCancel={() => { drag.current = null; }} />
      {!board.geometry.length && <div className="sch-overlay">Este PCBE todavía no tiene geometría compatible.</div>}
      <div className="sch-canvas-hint">Arrastrar para mover · Rueda para acercar · F para centrar</div>
    </div>
    <LayerControls catalog={board.layerCatalog} layers={layers} detail={detail} vias={vias} overlay={overlay} onDetail={setDetail} onVias={() => setVias(value => !value)} onOverlay={() => { setOverlay(value => !value); setLayers(current => new Set([[...current][0] ?? initialLayer(board.geometry)])); }} onLayer={id => { setLayers(current => overlay ? new Set([...current, id]) : new Set([id])); }} />
  </div>;
}
