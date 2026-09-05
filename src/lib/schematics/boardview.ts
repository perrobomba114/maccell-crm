import type { GeometryPrimitive, PcbeLayer, PcbeNet, PcbeNetEntry } from './types';

export type BoardPoint = { x: number; y: number };
export type HitTestOptions = { tolerance: number; visibleLayerIds: Set<number> };
export type LayerViewState = { visible: boolean; opacity: number };
export type LayerState = Record<string, LayerViewState>;
export type SelectionCandidate = {
  kind: 'pad' | 'via' | 'trace' | 'component';
  primitiveIndex: number;
  distance: number;
  componentId?: string;
  padId?: string;
  netId: number | null;
  label: string;
};

export type SpatialIndex = {
  cellSize: number;
  cells: Map<string, number[]>;
};

export function hasUsableNetId(netId: number | null): netId is number {
  return typeof netId === 'number' && netId > 0;
}

function primitiveNetId(primitive: GeometryPrimitive): number | null {
  if (!('netIndex' in primitive) || typeof primitive.netIndex !== 'number') return null;
  return hasUsableNetId(primitive.netIndex) ? primitive.netIndex : null;
}

export function primitiveNet(primitive: GeometryPrimitive): number | null { return primitiveNetId(primitive); }

function primitiveLayerIds(primitive: GeometryPrimitive): number[] {
  if (primitive.kind === 'via') return Array.from(new Set([primitive.layerA, primitive.layerB]));
  return [primitive.layer];
}

export function netLabel(net: Pick<PcbeNetEntry, 'id' | 'name'>): string {
  return net.name.trim() || `Net ${net.id}`;
}

export function buildNetCatalog(geometry: GeometryPrimitive[], entries: PcbeNetEntry[]): PcbeNet[] {
  const byId = new Map<number, PcbeNet>();
  for (const entry of entries) byId.set(entry.id, { ...entry, name: netLabel(entry), primitiveCount: 0, segmentCount: 0, viaCount: 0, pinCount: 0 });
  for (const primitive of geometry) {
    const id = primitiveNetId(primitive);
    if (id === null) continue;
    const net = byId.get(id) ?? { id, name: `Net ${id}`, primitiveCount: 0, segmentCount: 0, viaCount: 0, pinCount: 0 };
    net.primitiveCount += 1;
    if (primitive.kind === 'segment') net.segmentCount += 1;
    if (primitive.kind === 'via') net.viaCount += 1;
    if (primitive.kind === 'pin') net.pinCount += 1;
    byId.set(id, net);
  }
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

export function buildLayerCatalog(geometry: GeometryPrimitive[]): PcbeLayer[] {
  const byId = new Map<number, PcbeLayer>();
  for (const primitive of geometry) {
    const netId = primitiveNetId(primitive);
    for (const id of primitiveLayerIds(primitive)) {
      const layer = byId.get(id) ?? { id, name: `Layer ${id}`, primitiveCount: 0, netPrimitiveCount: 0, categories: {} };
      layer.primitiveCount += 1;
      if (netId !== null) layer.netPrimitiveCount += 1;
      layer.categories[primitive.kind] = (layer.categories[primitive.kind] ?? 0) + 1;
      byId.set(id, layer);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

export function componentLayerId(layers: PcbeLayer[]): number | null {
  return layers
    .map((layer) => ({
      layer,
      componentCount: (layer.categories.pin ?? 0) + (layer.categories.outline ?? 0),
      pinCount: layer.categories.pin ?? 0,
    }))
    .filter((entry) => entry.componentCount > 0)
    .sort((a, b) => b.pinCount - a.pinCount || b.componentCount - a.componentCount || a.layer.id - b.layer.id)[0]?.layer.id ?? null;
}

export function copperLayerId(layers: PcbeLayer[]): number | null {
  return layers
    .map((layer) => ({
      layer,
      segmentCount: layer.categories.segment ?? 0,
      copperCount: (layer.categories.segment ?? 0) + (layer.categories.via ?? 0),
    }))
    .filter((entry) => entry.segmentCount > 0)
    .sort((a, b) => b.segmentCount - a.segmentCount || b.copperCount - a.copperCount || a.layer.id - b.layer.id)[0]?.layer.id ?? null;
}

export type ReferenceLabelMode = 'none' | 'selected' | 'dense';

export function referenceLabelMode(zoom: number, selectedNetId: number | null, selectedComponentId: string | null): ReferenceLabelMode {
  if (selectedComponentId !== null) return 'selected';
  if (selectedNetId !== null) return 'none';
  return zoom >= 260 ? 'dense' : 'none';
}

export function renderableForSelection(semanticVisible: boolean, physicalVisible: boolean, selected: boolean): boolean {
  return semanticVisible && (physicalVisible || selected);
}

export type ComponentLabelAnchor = { componentId: string; name: string; x: number; y: number };

export function buildComponentLabelAnchors(document: { components: Array<{ id: string; name: string }>; geometry: GeometryPrimitive[] }): ComponentLabelAnchor[] {
  const points = new Map<string, Array<{ x: number; y: number }>>();
  for (const primitive of document.geometry) {
    if (!('componentId' in primitive) || !primitive.componentId) continue;
    const point = primitive.kind === 'pin'
      ? { x: primitive.x, y: primitive.y }
      : primitive.kind === 'outline'
        ? { x: (primitive.x1 + primitive.x2) / 2, y: (primitive.y1 + primitive.y2) / 2 }
        : null;
    if (!point) continue;
    const current = points.get(primitive.componentId) ?? [];
    current.push(point);
    points.set(primitive.componentId, current);
  }
  return document.components.flatMap((component) => {
    const componentPoints = points.get(component.id);
    if (!componentPoints?.length) return [];
    return [{
      componentId: component.id,
      name: component.name,
      x: componentPoints.reduce((sum, point) => sum + point.x, 0) / componentPoints.length,
      y: componentPoints.reduce((sum, point) => sum + point.y, 0) / componentPoints.length,
    }];
  });
}

export function isNetPrimitive(primitive: GeometryPrimitive, netId: number): boolean {
  return primitiveNetId(primitive) === netId;
}

export function netPrimitiveCount(geometry: GeometryPrimitive[], netId: number): number {
  return geometry.reduce((count, primitive) => count + (isNetPrimitive(primitive, netId) ? 1 : 0), 0);
}

function primitiveBounds(primitive: GeometryPrimitive): { minX: number; minY: number; maxX: number; maxY: number } {
  if (primitive.kind === 'segment' || primitive.kind === 'outline') {
    const radius = Math.abs(primitive.width) / 2;
    return { minX: Math.min(primitive.x1, primitive.x2) - radius, minY: Math.min(primitive.y1, primitive.y2) - radius, maxX: Math.max(primitive.x1, primitive.x2) + radius, maxY: Math.max(primitive.y1, primitive.y2) + radius };
  }
  if (primitive.kind === 'arc') return { minX: primitive.x - primitive.radius, minY: primitive.y - primitive.radius, maxX: primitive.x + primitive.radius, maxY: primitive.y + primitive.radius };
  if (primitive.kind === 'via') return { minX: primitive.x - primitive.outerRadius, minY: primitive.y - primitive.outerRadius, maxX: primitive.x + primitive.outerRadius, maxY: primitive.y + primitive.outerRadius };
  if (primitive.kind === 'pin') return { minX: primitive.x - primitive.radius, minY: primitive.y - primitive.radius, maxX: primitive.x + primitive.radius, maxY: primitive.y + primitive.radius };
  return { minX: primitive.x, minY: primitive.y, maxX: primitive.x, maxY: primitive.y };
}

function cellKey(x: number, y: number): string { return `${x}:${y}`; }

export function buildSpatialIndex(geometry: GeometryPrimitive[], cellSize = 5000): SpatialIndex {
  const cells = new Map<string, number[]>();
  geometry.forEach((primitive, index) => {
    const bounds = primitiveBounds(primitive);
    const minX = Math.floor(bounds.minX / cellSize);
    const maxX = Math.floor(bounds.maxX / cellSize);
    const minY = Math.floor(bounds.minY / cellSize);
    const maxY = Math.floor(bounds.maxY / cellSize);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const key = cellKey(x, y);
        const bucket = cells.get(key);
        if (bucket) bucket.push(index);
        else cells.set(key, [index]);
      }
    }
  });
  return { cellSize, cells };
}

function querySpatialIndex(index: SpatialIndex, point: BoardPoint, tolerance: number): number[] {
  const radius = Math.max(tolerance, 1);
  const minX = Math.floor((point.x - radius) / index.cellSize);
  const maxX = Math.floor((point.x + radius) / index.cellSize);
  const minY = Math.floor((point.y - radius) / index.cellSize);
  const maxY = Math.floor((point.y + radius) / index.cellSize);
  const result = new Set<number>();
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) for (const item of index.cells.get(cellKey(x, y)) ?? []) result.add(item);
  return [...result];
}

function distanceSquared(a: BoardPoint, b: BoardPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function distanceToSegment(point: BoardPoint, start: BoardPoint, end: BoardPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.sqrt(distanceSquared(point, start));
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.sqrt(distanceSquared(point, { x: start.x + t * dx, y: start.y + t * dy }));
}

function layerVisible(primitive: GeometryPrimitive, visibleLayerIds: Set<number>): boolean {
  return primitiveLayerIds(primitive).some((id) => visibleLayerIds.has(id));
}

export function hitTestNet(geometry: GeometryPrimitive[], point: BoardPoint, options: HitTestOptions): number | null {
  let closestNetId: number | null = null;
  let closestDistance = Infinity;
  const consider = (primitive: GeometryPrimitive, distance: number) => {
    const netId = primitiveNetId(primitive);
    if (netId === null || distance > options.tolerance) return;
    if (distance < closestDistance) { closestNetId = netId; closestDistance = distance; }
  };
  for (const primitive of geometry) {
    if (!layerVisible(primitive, options.visibleLayerIds)) continue;
    if (primitive.kind === 'pin') consider(primitive, Math.max(0, Math.sqrt(distanceSquared(point, { x: primitive.x, y: primitive.y })) - primitive.radius));
    else if (primitive.kind === 'via') consider(primitive, Math.max(0, Math.sqrt(distanceSquared(point, { x: primitive.x, y: primitive.y })) - primitive.outerRadius));
  }
  if (closestNetId !== null) return closestNetId;
  for (const primitive of geometry) {
    if (!layerVisible(primitive, options.visibleLayerIds) || primitive.kind !== 'segment') continue;
    consider(primitive, distanceToSegment(point, { x: primitive.x1, y: primitive.y1 }, { x: primitive.x2, y: primitive.y2 }));
  }
  return closestNetId;
}

function candidateFor(primitive: GeometryPrimitive, primitiveIndex: number, distance: number): SelectionCandidate | null {
  if (primitive.kind === 'pin') return { kind: 'pad', primitiveIndex, distance, componentId: primitive.componentId, padId: primitive.padId, netId: primitiveNetId(primitive), label: primitive.name || 'Pad sin nombre' };
  if (primitive.kind === 'via') return { kind: 'via', primitiveIndex, distance, netId: primitiveNetId(primitive), label: primitive.text || 'Vía' };
  if (primitive.kind === 'segment') return { kind: 'trace', primitiveIndex, distance, netId: primitiveNetId(primitive), label: 'Pista' };
  if (primitive.kind === 'outline' && primitive.componentId) return { kind: 'component', primitiveIndex, distance, componentId: primitive.componentId, netId: null, label: primitive.componentId };
  return null;
}

export function hitTestCandidates(geometry: GeometryPrimitive[], point: BoardPoint, options: HitTestOptions, index?: SpatialIndex): SelectionCandidate[] {
  const indexes = index ? querySpatialIndex(index, point, options.tolerance) : geometry.map((_, item) => item);
  const candidates: SelectionCandidate[] = [];
  for (const primitiveIndex of indexes) {
    const primitive = geometry[primitiveIndex];
    if (!primitive || !layerVisible(primitive, options.visibleLayerIds)) continue;
    let distance = Infinity;
    if (primitive.kind === 'pin') distance = Math.max(0, Math.sqrt(distanceSquared(point, { x: primitive.x, y: primitive.y })) - primitive.radius);
    else if (primitive.kind === 'via') distance = Math.max(0, Math.sqrt(distanceSquared(point, { x: primitive.x, y: primitive.y })) - primitive.outerRadius);
    else if (primitive.kind === 'segment' || primitive.kind === 'outline') distance = distanceToSegment(point, { x: primitive.x1, y: primitive.y1 }, { x: primitive.x2, y: primitive.y2 });
    const candidate = candidateFor(primitive, primitiveIndex, distance);
    if (candidate && distance <= options.tolerance) candidates.push(candidate);
  }
  const priority = { pad: 0, via: 1, component: 2, trace: 3 } as const;
  return candidates.sort((a, b) => a.distance - b.distance || priority[a.kind] - priority[b.kind] || a.primitiveIndex - b.primitiveIndex);
}

export function componentsForNet(document: { components: Array<{ id: string; name: string }>; geometry: GeometryPrimitive[] }, netId: number) {
  const ids = new Set(document.geometry.filter((primitive) => primitiveNetId(primitive) === netId && 'componentId' in primitive && primitive.componentId).map((primitive) => ('componentId' in primitive ? primitive.componentId : undefined)).filter((id): id is string => Boolean(id)));
  return document.components.filter((component) => ids.has(component.id));
}

export function layerIdsForPrimitive(primitive: GeometryPrimitive): number[] { return primitiveLayerIds(primitive); }
