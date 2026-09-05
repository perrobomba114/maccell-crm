"use client";
import { useEffect, useState } from 'react';
import type { SchematicAsset } from '@/lib/schematics/catalog-types';
import { compatibleCounterparts } from '@/lib/schematics/linked-navigation';
import type { CatalogPage } from './library-sidebar';

export function useLinkedAssets(anchor: SchematicAsset | null, onUnique: (asset: SchematicAsset) => void) {
  const [result, setResult] = useState<{ id?: string; candidates: SchematicAsset[]; error: string }>({ candidates: [], error: '' });
  useEffect(() => {
    if (!anchor) return;
    const controller = new AbortController();
    async function load() {
      const candidates: SchematicAsset[] = [];
      let page = 1;
      while (!controller.signal.aborted) {
        const response = await fetch(`/api/schematics/catalog?related=${anchor!.id}&kind=${anchor!.kind === 'pdf' ? 'pcbe' : 'pdf'}&pageSize=100&page=${page}`, { signal: controller.signal });
        if (!response.ok) throw new Error('No se pudieron consultar los archivos compatibles.');
        const result = await response.json() as CatalogPage;
        candidates.push(...result.assets);
        if (result.assets.length < 100 || candidates.length >= result.total) break;
        page++;
      }
      if (controller.signal.aborted) return;
      const compatible = compatibleCounterparts(anchor!, candidates);
      setResult({ id: anchor!.id, candidates, error: '' });
      if (compatible.length === 1) onUnique(compatible[0]);
    }
    setResult({ id: anchor.id, candidates: [], error: '' });
    void load().catch((error: unknown) => { if (!controller.signal.aborted) setResult({ id: anchor.id, candidates: [], error: error instanceof Error ? error.message : 'Error al vincular archivos' }); });
    return () => controller.abort();
  }, [anchor, onUnique]);
  return result.id === anchor?.id ? result : { candidates: [], error: '' };
}
