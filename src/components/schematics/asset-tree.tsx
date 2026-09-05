"use client";
import {roleLabels,documentRole} from '@/lib/schematics/pairing';
import { useMemo } from "react";
import { FileText, CircuitBoard, Smartphone } from "lucide-react";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";

type Props = { assets: SchematicAsset[]; boardId?: string; pdfId?: string; onOpen(asset: SchematicAsset): void; expanded: boolean };
export function AssetTree({ assets, boardId, pdfId, onOpen, expanded }: Props) {
  const models = useMemo(() => {
    const groups = new Map<string, { name: string; files: SchematicAsset[] }>();
    for (const asset of assets) {
      const group = groups.get(asset.modelKey) ?? { name: asset.model, files: [] };
      group.files.push(asset); groups.set(asset.modelKey, group);
    }
    return [...groups].sort((a, b) => a[1].name.localeCompare(b[1].name, "es", { numeric: true }));
  }, [assets]);
  return <>
    {!models.length && <p className="p-3 text-sm text-muted-foreground">No hay archivos para esta búsqueda.</p>}
    {models.map(([key, group]) => <details key={`${key}:${expanded}`} open={expanded || group.files.some(a => a.id === boardId || a.id === pdfId)} className="sch-folder">
      <summary><Smartphone size={16} /><span>{group.name}</span><small className="ml-auto text-muted-foreground">{group.files.length}</small></summary>
      <div className="pl-3">{group.files.map(asset => <button key={asset.id} className={`sch-asset ${asset.id === boardId || asset.id === pdfId ? "is-active" : ""}`} title={asset.relativePath} onClick={() => onOpen(asset)}>
        {asset.kind === "pcbe" ? <CircuitBoard size={16} /> : <FileText size={16} />}<span>{asset.name.replace(/\.(pcbe|pdf)$/i, "")}</span><small>{roleLabels[documentRole(asset)]}</small>{asset.status !== "ready" && <i title={asset.detail}>!</i>}
      </button>)}</div>
    </details>)}
  </>;
}
