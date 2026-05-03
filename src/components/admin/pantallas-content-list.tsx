"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { type ContentRow } from "@/lib/pantallas/types";
import { GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";

export function PantallasContentList({
  contents,
  onRename,
  onReorder,
  onRenameCommit,
  onToggle,
  onDelete,
  onPreview,
}: {
  contents: ContentRow[];
  onRename: (id: string, titulo: string) => void;
  onReorder: (from: number, to: number) => void;
  onRenameCommit: () => void;
  onToggle: (id: string, activo: boolean) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {contents.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (dragIndex === null || dragIndex === index) return;
            onReorder(dragIndex, index);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={`space-y-3 rounded-xl border p-3 transition ${dragIndex === index ? "border-primary bg-primary/5" : ""}`}
        >
          <div className="grid gap-3 lg:grid-cols-[32px_1fr_120px_130px]">
            <div className="flex h-10 items-center justify-center rounded-md border text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            <Input value={item.titulo} onChange={(e) => onRename(item.id, e.target.value)} onBlur={onRenameCommit} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={item.activo} onCheckedChange={(v) => onToggle(item.id, v === true)} /> Activo #{index + 1}
            </label>
            <Button variant="destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!item.activo} onClick={() => onPreview(item.id)}>
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
