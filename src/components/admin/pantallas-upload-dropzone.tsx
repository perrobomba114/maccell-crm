"use client";

import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

export function PantallasUploadDropzone({
  uploadingName,
  onFile,
}: {
  uploadingName: string | null;
  onFile: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`mt-2 rounded-xl border-2 border-dashed p-4 text-sm transition ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground">
          {uploadingName ? `Subiendo: ${uploadingName}` : "Arrastrá un archivo o seleccioná desde tu equipo"}
        </span>
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Elegir archivo
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.mp4"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
