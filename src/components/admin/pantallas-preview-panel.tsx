"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type ContentRow, type ScreenRow } from "@/lib/pantallas/types";
import { Badge } from "@/components/ui/badge";
import { Download, Maximize, Minimize, Pause, Play, SkipForward } from "lucide-react";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isVideo = !!previewItem?.archivo.toLowerCase().endsWith(".mp4");

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleFullscreen = () => {
    const el = previewRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  const handleTogglePlay = () => {
    if (isVideo && videoRef.current) {
      if (videoRef.current.paused) {
        void videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      return;
    }
    onAutoplayChange(!previewAutoPlay);
  };

  const handleDownload = () => {
    if (!previewItem) return;
    const url = `/api/uploads/pantallas/${previewItem.archivo}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = previewItem.archivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
          className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black/90"
        >
          {!previewItem && <span className="text-xs text-white/70">Sin contenidos activos</span>}
          {previewItem && isVideo && (
            <video
              ref={videoRef}
              key={previewItem.id}
              src={`/api/uploads/pantallas/${previewItem.archivo}`}
              controls={!isFullscreen}
              autoPlay={previewAutoPlay}
              muted
              className="h-full w-full object-contain"
              onEnded={onNext}
            />
          )}
          {previewItem && !isVideo && (
            <img
              src={`/api/uploads/pantallas/${previewItem.archivo}`}
              alt={previewItem.titulo}
              className="h-full w-full object-contain"
            />
          )}

          {isFullscreen && previewItem && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 opacity-0 transition-opacity duration-200 hover:opacity-100 group-hover:opacity-100">
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full bg-black/70 px-3 py-2 backdrop-blur">
                <Button
                  size="sm"
                  className="bg-amber-500 text-white hover:bg-amber-600"
                  onClick={handleTogglePlay}
                >
                  {(isVideo ? !videoRef.current?.paused : previewAutoPlay) ? (
                    <Pause className="mr-2 h-3.5 w-3.5" />
                  ) : (
                    <Play className="mr-2 h-3.5 w-3.5" />
                  )}
                  {(isVideo ? !videoRef.current?.paused : previewAutoPlay) ? "Pausa" : "Play"}
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-500 text-white hover:bg-blue-600"
                  onClick={onNext}
                >
                  <SkipForward className="mr-2 h-3.5 w-3.5" />
                  Siguiente
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-500 text-white hover:bg-purple-600"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Descargar
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-500 text-white hover:bg-rose-600"
                  onClick={handleFullscreen}
                >
                  <Minimize className="mr-2 h-3.5 w-3.5" />
                  Salir
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="line-clamp-1 text-xs text-muted-foreground">{previewItem?.titulo || "—"}</div>
        <div className="flex flex-wrap gap-2">
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
            className="flex-1 bg-purple-500 text-white hover:bg-purple-600"
            onClick={handleDownload}
            disabled={!previewItem}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Descargar
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
