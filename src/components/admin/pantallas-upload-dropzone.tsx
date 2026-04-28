"use client";

import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

export type PantallasUploadProgress = {
  id: string;
  name: string;
  percent: number;
  status: "uploading" | "saving" | "done" | "error";
};

export function PantallasUploadDropzone({
  progress,
  onFiles,
}: {
  progress: PantallasUploadProgress[];
  onFiles: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasProgress = progress.length > 0;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(files);
      }}
      className={`mt-2 rounded-xl border-2 border-dashed p-4 text-sm transition ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground">
          {hasProgress ? "Subiendo archivos..." : "Arrastrá archivos o seleccioná desde tu equipo"}
        </span>
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Elegir archivos
        </Button>
      </div>
      {hasProgress && (
        <div className="mt-4 space-y-2">
          {progress.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="font-medium">{item.status === "done" ? "Listo" : item.status === "error" ? "Error" : `${item.percent}%`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${item.status === "error" ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.mp4"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
