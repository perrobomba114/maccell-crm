"use client";
import { useEffect, useState } from 'react';
import { validPdfBox, type PdfBox } from '@/lib/schematics/linked-navigation';

export function usePdfPageIndex(id: string, page: number, revision: number) {
  const [result, setResult] = useState<{ key: string; boxes: PdfBox[]; source?: string } | null>(null);
  const key = `${id}:${page}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/schematics/${id}/index?page=${page}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const data = await response.json() as { status: string; page?: { page: number; boxes: PdfBox[]; source: string } };
      if (!controller.signal.aborted && ['indexed','partial'].includes(data.status) && data.page?.page === page) setResult({ key, boxes: data.page.boxes.filter(validPdfBox), source: data.page.source });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) console.warn('[PDF] Índice de coordenadas no disponible', cause instanceof Error ? cause.message : 'Error'); });
    return () => controller.abort();
  }, [id, page, revision, key]);
  return result?.key === key ? result : null;
}
