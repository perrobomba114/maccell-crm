export type PcbeHeader = {
  xorIndicator: number;
  addressesSize: number;
  imageBlockStart: number;
  netBlockStart: number;
  mainDataSize: number;
};

export type PcbeBlock = {
  type: number;
  name: string;
  sizeBytes: number;
  offset: number;
  decoded: boolean;
};

export type PcbeNetEntry = { id: number; name: string };

export type PcbeNet = PcbeNetEntry & {
  primitiveCount: number;
  segmentCount: number;
  viaCount: number;
  pinCount: number;
};

export type PcbeLayer = {
  id: number;
  name: string;
  primitiveCount: number;
  netPrimitiveCount: number;
  categories: Record<string, number>;
};

export type PcbePad = {
  id: string;
  name: string;
  componentId: string;
  layer: number;
  x: number;
  y: number;
  radius: number;
  netIndex: number | null;
};

export type PcbeComponent = {
  id: string;
  name: string;
  kind: string;
  pads: PcbePad[];
  outlineCount: number;
};

export type GeometryPrimitive =
  | { kind: 'segment'; layer: number; x1: number; y1: number; x2: number; y2: number; width: number; netIndex: number }
  | { kind: 'arc'; layer: number; x: number; y: number; radius: number; startAngle: number; endAngle: number; width: number }
  | { kind: 'via'; layer: number; x: number; y: number; outerRadius: number; innerRadius: number; layerA: number; layerB: number; netIndex: number; text: string }
  | { kind: 'text'; layer: number; x: number; y: number; size: number; text: string }
  | { kind: 'outline'; layer: number; x1: number; y1: number; x2: number; y2: number; width: number; componentId?: string }
  | { kind: 'pin'; layer: number; x: number; y: number; radius: number; netIndex: number | null; name: string; componentId?: string; padId?: string };

export type PcbeAsset = {
  id?: string;
  name: string;
  relativePath?: string;
  sizeBytes: number;
  sha256?: string | null;
  signature: string | null;
  validHeader: boolean;
};

export type PcbeDocument = PcbeAsset & {
  header: PcbeHeader;
  blocks: PcbeBlock[];
  geometry: GeometryPrimitive[];
  components: PcbeComponent[];
  nets: string[];
  netCatalog: PcbeNet[];
  layerCatalog: PcbeLayer[];
  warnings: string[];
};
