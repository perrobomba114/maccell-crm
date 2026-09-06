"use client";

import { useMemo } from "react";
import { roleLabels, documentRole } from "@/lib/schematics/pairing";
import { FileText, CircuitBoard, Folder } from "lucide-react";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";
import { buildDirectoryTree, nodeContainsAsset, type DirectoryNode } from "@/lib/schematics/tree";

type Props = {
  assets: SchematicAsset[];
  boardId?: string;
  pdfId?: string;
  onOpen(asset: SchematicAsset): void;
  expanded: boolean;
};

function DirectoryBranch({
  node,
  boardId,
  pdfId,
  onOpen,
  expanded,
  level = 0,
}: {
  node: DirectoryNode;
  boardId?: string;
  pdfId?: string;
  onOpen(asset: SchematicAsset): void;
  expanded: boolean;
  level?: number;
}) {
  const containsActive = useMemo(
    () => nodeContainsAsset(node, boardId) || nodeContainsAsset(node, pdfId),
    [node, boardId, pdfId]
  );
  const isOpen = expanded || containsActive || level === 0;

  return (
    <details key={`${node.fullPath}:${expanded}:${isOpen}`} open={isOpen} className="sch-folder select-none">
      <summary className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-muted/70 cursor-pointer text-xs font-semibold text-foreground/90 transition-colors">
        <Folder size={14} className="text-primary/80 shrink-0" />
        <span className="truncate flex-1">{node.name}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-normal text-muted-foreground shrink-0">
          {node.totalFiles}
        </span>
      </summary>

      <div className="sch-folder-children pl-2 ml-1.5 border-l border-border/50 flex flex-col gap-0.5 mt-0.5 mb-1">
        {Array.from(node.subfolders.values())
          .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }))
          .map((sub) => (
            <DirectoryBranch
              key={sub.fullPath}
              node={sub}
              boardId={boardId}
              pdfId={pdfId}
              onOpen={onOpen}
              expanded={expanded}
              level={level + 1}
            />
          ))}

        {node.files.map((asset) => {
          const isActive = asset.id === boardId || asset.id === pdfId;
          const isPcbe = asset.kind === "pcbe";
          return (
            <button
              key={asset.id}
              type="button"
              aria-pressed={isActive}
              className={`sch-asset flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md text-xs transition-colors ${
                isActive
                  ? "is-active bg-primary/15 text-primary font-medium shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              title={asset.relativePath}
              onClick={() => onOpen(asset)}
            >
              {isPcbe ? (
                <CircuitBoard size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <FileText size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="sch-asset-description flex-1 min-w-0">
                <strong className="block truncate text-foreground/95 font-medium leading-tight">
                  {asset.name.replace(/\.(pcbe|pdf)$/i, "")}
                </strong>
                <small className="block text-[10px] text-muted-foreground truncate">
                  {roleLabels[documentRole(asset)]}
                </small>
              </div>
              {asset.status !== "ready" && (
                <i className="text-amber-500 not-italic text-xs font-bold shrink-0 ml-1" title={asset.detail}>
                  !
                </i>
              )}
            </button>
          );
        })}
      </div>
    </details>
  );
}

export function AssetTree({ assets, boardId, pdfId, onOpen, expanded }: Props) {
  const tree = useMemo(() => buildDirectoryTree(assets), [assets]);

  if (!assets.length) {
    return <p className="p-4 text-xs text-muted-foreground text-center">No hay archivos para esta búsqueda.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {tree.map((node) => (
        <DirectoryBranch
          key={node.fullPath}
          node={node}
          boardId={boardId}
          pdfId={pdfId}
          onOpen={onOpen}
          expanded={expanded}
          level={0}
        />
      ))}
    </div>
  );
}
