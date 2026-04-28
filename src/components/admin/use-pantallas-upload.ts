"use client";

import { addPantallaContenidoAction } from "@/actions/pantallas-actions";
import { type PantallasUploadProgress } from "@/components/admin/pantallas-upload-dropzone";
import { useCallback, useState } from "react";

function uploadFile(file: File, screenId: string, onProgress: (percent: number) => void): Promise<{ path: string; size: number; name: string }> {
  return new Promise((resolve, reject) => {
    const data = new FormData();
    data.append("screenId", screenId);
    data.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/pantallas/upload");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      try {
        const payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status < 200 || xhr.status >= 300 || payload.error) {
          reject(new Error(payload.error || "No se pudo subir el archivo"));
          return;
        }
        resolve(payload);
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error("No se pudo conectar con el servidor"));
    xhr.send(data);
  });
}

export function usePantallasUpload({
  screenId,
  onUploaded,
}: {
  screenId: string | null;
  onUploaded: (successCount: number) => Promise<void>;
}) {
  const [uploadProgress, setUploadProgress] = useState<PantallasUploadProgress[]>([]);

  const clearUploadProgress = useCallback(() => {
    setUploadProgress([]);
  }, []);

  function setProgressItem(id: string, patch: Partial<PantallasUploadProgress>) {
    setUploadProgress((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function uploadContents(files: File[]) {
    if (!screenId) return;
    const queue = files.map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    }));

    setUploadProgress(queue.map(({ file, id }) => ({ id, name: file.name, percent: 0, status: "uploading" })));

    let successCount = 0;
    for (const item of queue) {
      try {
        const payload = await uploadFile(item.file, screenId, (percent) => setProgressItem(item.id, { percent }));
        setProgressItem(item.id, { percent: 100, status: "saving" });
        await addPantallaContenidoAction({
          screenId,
          titulo: payload.name,
          archivo: payload.path,
          peso: payload.size,
        });
        successCount += 1;
        setProgressItem(item.id, { percent: 100, status: "done" });
      } catch (error) {
        setProgressItem(item.id, { status: "error" });
        window.alert(error instanceof Error ? error.message : `No se pudo subir ${item.file.name}`);
      }
    }

    if (successCount > 0) await onUploaded(successCount);
  }

  return { clearUploadProgress, uploadContents, uploadProgress };
}
