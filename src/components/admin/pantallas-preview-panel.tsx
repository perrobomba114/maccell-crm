"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { type ContentRow, type ScreenRow } from "@/lib/pantallas/types";
import { Badge } from "@/components/ui/badge";
import { Maximize, Pause, Play, SkipForward } from "lucide-react";

export function PantallasPreviewPanel({
  screen,
  contents,
  previewItem,
  previewAutoPlay,
  onAutoplayChange,
  onNext,
}: {
  screen: ScreenRow;
  contents: ContentRow[];
  previewItem: ContentRow | null;
  previewAutoPlay: boolean;
  onAutoplayChange: (enabled: boolean) => void;
  onNext: () => void;
}) {
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = () => {
    const el = previewRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Previsualización activa</div>
            <div className="text-xs text-muted-foreground">Solo muestra archivos marcados como activos.</div>
          </div>
          <Badge variant={previewAutoPlay ? "default" : "secondary"}>{previewAutoPlay ? "Autoplay" : "Manual"}</Badge>
        </div>
        <div
          ref={previewRef}
          className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black/90"
        >
          {!previewItem && <span className="text-xs text-white/70">Sin contenidos activos</span>}
          {previewItem?.archivo.toLowerCase().endsWith(".mp4") && (
            <video
              key={previewItem.id}
              src={`/api/uploads/pantallas/${previewItem.archivo}`}
              controls
              autoPlay={previewAutoPlay}
              muted
              className="h-full w-full object-contain"
              onEnded={onNext}
            />
          )}
          {previewItem && !previewItem.archivo.toLowerCase().endsWith(".mp4") && (
            <img src={`/api/uploads/pantallas/${previewItem.archivo}`} alt={previewItem.titulo} className="h-full w-full object-contain" />
          )}
        </div>
        <div className="line-clamp-1 text-xs text-muted-foreground">{previewItem?.titulo || "—"}</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => onAutoplayChange(!previewAutoPlay)}
          >
            {previewAutoPlay ? <Pause className="mr-2 h-3.5 w-3.5" /> : <Play className="mr-2 h-3.5 w-3.5" />}
            {previewAutoPlay ? "Pausa" : "Play"}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
            onClick={onNext}
          >
            <SkipForward className="mr-2 h-3.5 w-3.5" />
            Siguiente
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={handleFullscreen}
          >
            <Maximize className="mr-2 h-3.5 w-3.5" />
            Pantalla completa
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        Todas las publicidades corren 24/7. No hay programación por días. Duración de imagen: {screen.duracion}s.
        Archivos activos en preview: {contents.length}.
      </div>
    </div>
  );
}
