"use client";

import { Button } from "@/components/ui/button";
import { type ContentRow, type ScreenRow } from "@/lib/pantallas/types";
import { Badge } from "@/components/ui/badge";
import { Play, SkipForward } from "lucide-react";

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
        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black/90">
          {!previewItem && <span className="text-xs text-white/70">Sin contenidos activos</span>}
          {previewItem?.archivo.toLowerCase().endsWith(".mp4") && (
            <video
              key={previewItem.id}
              src={`/api/uploads/pantallas/${previewItem.archivo}`}
              controls
              autoPlay={previewAutoPlay}
              muted
              className="h-full w-full object-cover"
              onEnded={onNext}
            />
          )}
          {previewItem && !previewItem.archivo.toLowerCase().endsWith(".mp4") && (
            <img src={`/api/uploads/pantallas/${previewItem.archivo}`} alt={previewItem.titulo} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="line-clamp-1 text-xs text-muted-foreground">{previewItem?.titulo || "—"}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onAutoplayChange(!previewAutoPlay)}>
            <Play className="mr-2 h-3.5 w-3.5" />
            {previewAutoPlay ? "Pausa" : "Play"}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onNext}>
            <SkipForward className="mr-2 h-3.5 w-3.5" />
            Siguiente
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
