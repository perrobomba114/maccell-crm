"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { type ContentRow } from "@/lib/pantallas/types";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export function PantallasContentList({
  contents,
  onRename,
  onMove,
  onRenameCommit,
  onToggle,
  onDelete,
  onPreview,
}: {
  contents: ContentRow[];
  onRename: (id: string, titulo: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRenameCommit: () => void;
  onToggle: (id: string, activo: boolean) => void;
  onDelete: (id: string) => void;
  onPreview: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      {contents.map((item, index) => (
        <div key={item.id} className="space-y-3 rounded-xl border p-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_110px_120px_130px]">
            <Input value={item.titulo} onChange={(e) => onRename(item.id, e.target.value)} onBlur={onRenameCommit} />
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" onClick={() => onMove(index, -1)} disabled={index <= 0}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => onMove(index, 1)} disabled={index >= contents.length - 1}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">#{index + 1}</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={item.activo} onCheckedChange={(v) => onToggle(item.id, v === true)} /> Activo
            </label>
            <Button variant="destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onPreview(index)}>
              Previsualizar este
            </Button>
          </div>
          <a className="block text-xs text-muted-foreground underline" href={`/api/uploads/pantallas/${item.archivo}`} target="_blank" rel="noreferrer">
            {item.archivo}
          </a>
        </div>
      ))}
    </div>
  );
}
