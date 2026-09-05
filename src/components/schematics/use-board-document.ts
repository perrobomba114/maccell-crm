"use client";
import { useEffect, useState } from "react";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";
import type { PcbeDocument } from "@/lib/schematics/types";

export function useBoardDocument(asset: SchematicAsset | null) {
  const [result, setResult] = useState<{ id?: string; board: PcbeDocument | null; error: string; loading: boolean }>({ board: null, error: "", loading: false });
  useEffect(() => {
    if (!asset) return;
    const controller = new AbortController();
    let worker: Worker | undefined;
    setResult({ id: asset.id, board: null, error: "", loading: true });
    async function load() {
      try {
        const response = await fetch(`/api/schematics/${asset!.id}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "La sesión venció. Volvé a ingresar." : "No se pudo abrir la placa.");
        const bytes = await response.arrayBuffer();
        if (controller.signal.aborted) return;
        worker = new Worker(new URL("./pcbe.worker.ts", import.meta.url));
        worker.onmessage = (event: MessageEvent<{ board?: PcbeDocument; error?: string }>) => {
          if (!controller.signal.aborted) setResult({ id: asset!.id, board: event.data.board ?? null, error: event.data.error ?? "", loading: false });
          worker?.terminate();
        };
        worker.onerror = () => { if (!controller.signal.aborted) setResult({ id: asset!.id, board: null, error: "No se pudo procesar la placa. Volvé a abrir el archivo.", loading: false }); worker?.terminate(); };
        worker.postMessage({ bytes, name: asset!.name }, [bytes]);
      } catch (error) {
        if (!controller.signal.aborted) setResult({ id: asset!.id, board: null, error: error instanceof Error ? error.message : "No se pudo cargar la placa", loading: false });
      }
    }
    void load();
    return () => { controller.abort(); worker?.terminate(); };
  }, [asset]);
  return result.id === asset?.id ? result : { board: null, error: "", loading: !!asset };
}
