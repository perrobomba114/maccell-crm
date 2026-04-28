"use client";

import { PantallasUploadDropzone, type PantallasUploadProgress } from "@/components/admin/pantallas-upload-dropzone";
import { Label } from "@/components/ui/label";

export function PantallasUploadPanel({
  progress,
  onFiles,
}: {
  progress: PantallasUploadProgress[];
  onFiles: (files: File[]) => void;
}) {
  return (
    <div className="rounded-xl border p-3">
      <Label>Subir archivos</Label>
      <PantallasUploadDropzone progress={progress} onFiles={onFiles} />
    </div>
  );
}
