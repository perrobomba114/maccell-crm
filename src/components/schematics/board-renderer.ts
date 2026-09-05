import { netColor } from "@/lib/schematics/net-style";
import { physicalTracks } from "@/lib/schematics/physical-tracks";
import { workshopGeometry, type BoardDetail } from "@/lib/schematics/visibility";
import { connectionsFor } from "@/lib/schematics/connections";
import type { GeometryPrimitive, PcbeDocument } from "@/lib/schematics/types";

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
export type View = { zoom: number; x: number; y: number };
export function boundsFor(items: GeometryPrimitive[]): Bounds {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const add = (x: number, y: number, r = 0) => { b.minX = Math.min(b.minX, x - r); b.minY = Math.min(b.minY, y - r); b.maxX = Math.max(b.maxX, x + r); b.maxY = Math.max(b.maxY, y + r); };
  for (const p of items) {
    if (p.kind === "segment" || p.kind === "outline") { add(p.x1, p.y1); add(p.x2, p.y2); }
    else add(p.x, p.y, p.kind === "pin" || p.kind === "arc" ? p.radius : p.kind === "via" ? p.outerRadius : 0);
  }
  return Number.isFinite(b.minX) ? b : { minX: 0, minY: 0, maxX: 1, maxY: 1 };
}
export function transformFor(width: number, height: number, bounds: Bounds, view: View) {
  const bw = Math.max(1, bounds.maxX - bounds.minX), bh = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.max(.000001, Math.min((width - 48) / bw, (height - 48) / bh) * view.zoom);
  const ox = (width - bw * scale) / 2 + view.x, oy = (height - bh * scale) / 2 + view.y;
  return { scale, x: (x: number) => ox + (x - bounds.minX) * scale, y: (y: number) => oy + (bounds.maxY - y) * scale,
    inverse: (x: number, y: number) => ({ x: bounds.minX + (x - ox) / scale, y: bounds.maxY - (y - oy) / scale }) };
}
const palette = ["#90b8bd", "#d9ac65", "#86afa0", "#8b9ac1", "#b78b96", "#b3be87"];
export function renderBoard(canvas: HTMLCanvasElement, document: PcbeDocument, bounds: Bounds, view: View, layers: Set<number>, component: string | null, net: number | null, detail: BoardDetail = "clean", vias = false) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#09090b"; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#202027";
  for (let x = 12; x < width; x += 24) for (let y = 12; y < height; y += 24) ctx.fillRect(x, y, 1, 1);
  const t = transformFor(width, height, bounds, view);
  const connections = connectionsFor(document.components, component, net);
  const netNames = new Map(document.netCatalog.map(item => [item.id, item.name]));
  const relatedIds = new Set(connections.components.map(part => part.id));
  const isOrigin = (p: GeometryPrimitive) => component !== null && "componentId" in p && p.componentId === component;
  const onNet = (p: GeometryPrimitive) => "netIndex" in p && p.netIndex !== null && connections.nets.has(p.netIndex);
  const selected = (p: GeometryPrimitive) => isOrigin(p) || onNet(p) || (p.kind === "outline" && !!p.componentId && relatedIds.has(p.componentId));
  const visibleItems = new Set(workshopGeometry(document.geometry, layers, detail, vias));
  const visible = (p: GeometryPrimitive) => visibleItems.has(p);
  const draw = (p: GeometryPrimitive, active: boolean) => {
    ctx.globalAlpha = active ? 1 : net !== null || component !== null ? .45 : .9;
    ctx.strokeStyle = ctx.fillStyle = active ? (onNet(p) ? netColor("netIndex" in p ? netNames.get(p.netIndex ?? -1) ?? "" : "") : isOrigin(p) ? "#fbbf24" : "#60a5fa") : p.kind === "pin" || p.kind === "outline" ? "#e1bc77" : palette[p.layer % palette.length];
    if (p.kind === "segment" || p.kind === "outline") {
      ctx.lineWidth = Math.max(active ? 1.2 : .65, Math.min(10, p.width * t.scale * .35));
      ctx.beginPath(); ctx.moveTo(t.x(p.x1), t.y(p.y1)); ctx.lineTo(t.x(p.x2), t.y(p.y2)); ctx.stroke();
    } else if (p.kind === "pin" || p.kind === "via" || p.kind === "arc") {
      const x = t.x(p.x), y = t.y(p.y), r = Math.max(.75, (p.kind === "via" ? p.outerRadius : p.radius) * t.scale);
      if (x + r < 0 || y + r < 0 || x - r > width || y - r > height) return;
      ctx.beginPath(); ctx.lineWidth = active ? 1.8 : .8;
      ctx.arc(x, y, r, p.kind === "arc" ? -p.startAngle / 10000 * Math.PI / 180 : 0, p.kind === "arc" ? -p.endAngle / 10000 * Math.PI / 180 : 2 * Math.PI);
      if (p.kind === "pin") ctx.fill(); else ctx.stroke();
    } else if (view.zoom > 2 && p.text) {
      ctx.font = "10px monospace"; ctx.fillText(p.text, t.x(p.x), t.y(p.y));
    }
  };
  for (const p of document.geometry) if (!selected(p) && visible(p)) draw(p, false);
  const tracks = physicalTracks(document.geometry, connections.nets);
  // Reveal only this net's real copper, not all copper on its layers.
  for (const track of tracks) draw(track, true);
  for (const p of document.geometry) if (p.kind !== "segment" && selected(p) && visible(p)) draw(p, true);
  if (connections.nets.size) {
    const trackLayers = [...new Set(tracks.map(track => track.layer))].sort((a, b) => a - b);
    ctx.globalAlpha = 1; ctx.fillStyle = "#e4e4e7"; ctx.font = "12px sans-serif";
    ctx.fillText(tracks.length ? `Pistas del archivo · ${trackLayers.map(id => "L" + id).join(", ")} · pueden incluir capas internas` : "Sin recorrido de pista decodificado para esta selección; solo pads conectados.", 12, 20);
  }
  const part = document.components.find((p) => p.id === component);
  // Diode-value boardviews encode readings as positioned text, not pad fields.
  // Preserve the original text and position; do not infer units or pad ownership.
  if (/diode[ _-]*value/i.test(document.name) && view.zoom > 2) {
    ctx.globalAlpha = 1;
    ctx.font = "bold 11px monospace";
    for (const item of document.geometry) {
      if (item.kind !== "text" || !/^(?:\d+(?:[.,]\d+)?|OL|GND)$/i.test(item.text.trim())) continue;
      const x = t.x(item.x), y = t.y(item.y);
      if (x < 0 || y < 0 || x > width || y > height) continue;
      const label = item.text.trim();
      ctx.fillStyle = "#09090be6";
      ctx.fillRect(x - 2, y - 12, ctx.measureText(label).width + 4, 15);
      ctx.fillStyle = "#f0abfc";
      ctx.fillText(label, x, y);
    }
    ctx.fillStyle = "#f0abfc";
    ctx.fillText("Valores de diodo: anotaciones originales · unidad/polaridad no verificadas", 12, 38);
  }
  const pad = part?.pads.find(item => layers.has(item.layer));
  if (part && pad) { ctx.globalAlpha = 1; ctx.fillStyle = "#e5f6d8"; ctx.font = "bold 12px monospace"; ctx.fillText(part.name, t.x(pad.x) + 8, t.y(pad.y) - 10);
  }
  ctx.globalAlpha = 1;
}
