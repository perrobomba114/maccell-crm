"use client";

import {
  addPantallaContenidoAction,
  createPantallaAction,
  deletePantallaAction,
  deletePantallaContenidoAction,
  getPantallaContentsAction,
  regeneratePantallaKeyAction,
  savePantallaContenidosAction,
  updatePantallaAction,
} from "@/actions/pantallas-actions";
import { PantallasScreenSettings } from "@/components/admin/pantallas-screen-settings";
import { PantallasUploadDropzone } from "@/components/admin/pantallas-upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIMEZONE } from "@/lib/date-utils";
import { type ContentRow, type ScreenRow } from "@/lib/pantallas/types";
import { ChevronDown, ChevronUp, Monitor, Play, Plus, RefreshCw, SkipForward, Trash2, Upload, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

type ScreenWithCount = ScreenRow & { contenidos: number };

function fmtDate(date: Date | null) {
  if (!date) return "Nunca";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: TIMEZONE }).format(new Date(date));
}

function moveItem<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
  return next;
}

export function PantallasClient({ initialScreens }: { initialScreens: ScreenWithCount[] }) {
  const [screens] = useState(initialScreens);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(initialScreens[0]?.id ?? null);
  const [screenForm, setScreenForm] = useState({ nombre: "", duracion: 15, activo: true });
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [pending, startTransition] = useTransition();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAutoPlay, setPreviewAutoPlay] = useState(true);
  const [uploadingName, setUploadingName] = useState<string | null>(null);

  const selectedScreen = useMemo(() => screens.find((s) => s.id === selectedScreenId) ?? null, [screens, selectedScreenId]);
  const previewItem = contents[previewIndex] ?? null;
  const [isSaving, setIsSaving] = useState(false);

  async function refreshScreens() {
    window.location.reload();
  }

  async function loadContents(screenId: string) {
    setLoadingContents(true);
    try {
      setContents(await getPantallaContentsAction(screenId));
      setPreviewIndex(0);
    } finally {
      setLoadingContents(false);
    }
  }

  async function createScreen() {
    if (!screenForm.nombre.trim()) {
      window.alert("El nombre es obligatorio");
      return;
    }
    setIsSaving(true);
    startTransition(async () => {
      try {
        await createPantallaAction(screenForm);
        await refreshScreens();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "No se pudo crear la pantalla");
      } finally {
        setIsSaving(false);
      }
    });
  }

  async function uploadContent(file: File) {
    if (!selectedScreen) return;
    setUploadingName(file.name);
    try {
      const data = new FormData();
      data.append("screenId", selectedScreen.id);
      data.append("file", file);

      const response = await fetch("/api/admin/pantallas/upload", { method: "POST", body: data });
      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : {};
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "No se pudo subir el archivo");
      }

      await addPantallaContenidoAction({
        screenId: selectedScreen.id,
        titulo: payload.name,
        archivo: payload.path,
        peso: payload.size,
      });

      await loadContents(selectedScreen.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally {
      setUploadingName(null);
    }
  }

  async function saveContents() {
    setIsSaving(true);
    startTransition(async () => {
      try {
        await savePantallaContenidosAction(
          contents.map((item, index) => ({
            id: item.id,
            titulo: item.titulo,
            activo: item.activo,
            orden: index + 1,
            days: {
              lunes: true,
              martes: true,
              miercoles: true,
              jueves: true,
              viernes: true,
              sabado: true,
              domingo: true,
            },
          }))
        );

        if (selectedScreen) await loadContents(selectedScreen.id);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "No se pudieron guardar los contenidos");
      } finally {
        setIsSaving(false);
      }
    });
  }

  useEffect(() => {
    if (!selectedScreenId) {
      setContents([]);
      return;
    }

    let cancelled = false;
    setLoadingContents(true);
    getPantallaContentsAction(selectedScreenId)
      .then((items) => {
        if (cancelled) return;
        setContents(items);
        setPreviewIndex(0);
      })
      .catch((error) => {
        if (cancelled) return;
        window.alert(error instanceof Error ? error.message : "No se pudieron cargar los contenidos");
      })
      .finally(() => {
        if (!cancelled) setLoadingContents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedScreenId]);

  useEffect(() => {
    if (!previewAutoPlay || !selectedScreen || contents.length === 0) return;
    const item = contents[previewIndex];
    if (!item) return;

    const isVideo = item.archivo.toLowerCase().endsWith(".mp4") || item.archivo.toLowerCase().endsWith(".webm");
    if (isVideo) return;

    const timer = window.setTimeout(() => {
      setPreviewIndex((i) => (i + 1) % contents.length);
    }, Math.max(1, selectedScreen.duracion) * 1000);

    return () => window.clearTimeout(timer);
  }, [previewAutoPlay, selectedScreen, contents, previewIndex]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Pantallas</h1>
          <p className="text-sm text-muted-foreground">Identificá la TV por lo que muestra y renombrala desde acá.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <a href="/api/pantallas/health" target="_blank" rel="noreferrer">Health</a>
          </Button>
          <Button variant="outline" onClick={refreshScreens}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="text-base">Crear pantalla</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Nombre" value={screenForm.nombre} onChange={(e) => setScreenForm((s) => ({ ...s, nombre: e.target.value }))} />
              <Input type="number" min={1} value={screenForm.duracion} onChange={(e) => setScreenForm((s) => ({ ...s, duracion: Number(e.target.value) || 1 }))} />
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={screenForm.activo} onCheckedChange={(v) => setScreenForm((s) => ({ ...s, activo: v === true }))} /> Activa</label>
              <Button className="w-full" onClick={createScreen} disabled={pending || isSaving}><Plus className="mr-2 h-4 w-4" />Crear pantalla</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pantallas ({screens.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[62vh] overflow-auto">
              {screens.map((screen) => (
                <div
                  role="button"
                  tabIndex={0}
                  key={screen.id}
                  onClick={() => setSelectedScreenId(screen.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedScreenId(screen.id);
                    }
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${selectedScreenId === screen.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{screen.nombre}</div>
                      <div className="text-xs text-muted-foreground">{screen.contenidos} contenidos • {screen.duracion}s</div>
                    </div>
                    <Badge variant={screen.activo ? "default" : "secondary"}>{screen.activo ? "Activa" : "Pausada"}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {screen.lastseen ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5" />}
                    {fmtDate(screen.lastseen)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => startTransition(async () => { try { await updatePantallaAction({ id: screen.id, nombre: screen.nombre, duracion: screen.duracion, activo: !screen.activo }); await refreshScreens(); } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo actualizar la pantalla"); } })}>
                      {screen.activo ? "Pausar" : "Activar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startTransition(async () => { try { await regeneratePantallaKeyAction(screen.id); window.alert("Pantalla desvinculada. Abrí la APK y seleccioná esta pantalla para vincularla de nuevo."); await refreshScreens(); } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo desvincular la pantalla"); } })}>Reset vínculo</Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (!window.confirm("¿Eliminar pantalla y contenidos?")) return; startTransition(async () => { try { await deletePantallaAction(screen.id); await refreshScreens(); } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo eliminar la pantalla"); } }); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-[70vh]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Monitor className="h-4 w-4" />{selectedScreen ? `Contenidos de ${selectedScreen.nombre}` : "Seleccioná una pantalla"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedScreen && (
              <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Previsualización</div>
                    <label className="flex items-center gap-2 text-xs"><Checkbox checked={previewAutoPlay} onCheckedChange={(v) => setPreviewAutoPlay(v === true)} /> Autoplay</label>
                  </div>
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-black/90 flex items-center justify-center">
                    {!previewItem && <span className="text-xs text-white/70">Sin contenidos</span>}
                    {previewItem && previewItem.archivo.toLowerCase().endsWith(".mp4") && <video key={previewItem.id} src={`/api/uploads/pantallas/${previewItem.archivo}`} controls autoPlay={previewAutoPlay} muted className="h-full w-full object-contain" onEnded={() => setPreviewIndex((i) => (i + 1) % contents.length)} />}
                    {previewItem && !previewItem.archivo.toLowerCase().endsWith(".mp4") && <img src={`/api/uploads/pantallas/${previewItem.archivo}`} alt={previewItem.titulo} className="h-full w-full object-contain" />}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{previewItem?.titulo || "—"}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewAutoPlay((v) => !v)}><Play className="mr-2 h-3.5 w-3.5" /> {previewAutoPlay ? "Pausa" : "Play"}</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewIndex((i) => (i + 1) % Math.max(contents.length, 1))}><SkipForward className="mr-2 h-3.5 w-3.5" /> Siguiente</Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground rounded-xl border border-dashed p-3">Todas las publicidades corren 24/7. No hay programación por días.</div>
              </div>
            )}

            {selectedScreen && (
              <PantallasScreenSettings
                screen={selectedScreen}
                pending={pending}
                onSave={(input) => {
                  startTransition(async () => {
                    try {
                      await updatePantallaAction(input);
                      await refreshScreens();
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "No se pudo guardar la configuración");
                    }
                  });
                }}
              />
            )}

            {selectedScreen && (
              <div className="flex flex-wrap items-end gap-3 rounded-xl border p-3">
                <div className="grow">
                  <Label>Subir archivo</Label>
                  <PantallasUploadDropzone uploadingName={uploadingName} onFile={(file) => {
                    void uploadContent(file);
                  }} />
                </div>
                <Button onClick={saveContents} disabled={pending || isSaving}><Upload className="mr-2 h-4 w-4" />Guardar cambios</Button>
              </div>
            )}

            {loadingContents && <div className="text-sm text-muted-foreground">Cargando contenidos...</div>}
            {!loadingContents && selectedScreen && contents.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Esta pantalla aún no tiene contenidos.</div>}

            {!loadingContents && contents.length > 0 && (
              <div className="space-y-3">
                {contents.map((item, index) => (
                  <div key={item.id} className="rounded-xl border p-3 space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[1fr_110px_120px_130px]">
                      <Input value={item.titulo} onChange={(e) => setContents((rows) => rows.map((row) => row.id === item.id ? { ...row, titulo: e.target.value } : row))} />
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" onClick={() => index > 0 && setContents((rows) => moveItem(rows, index, index - 1))}><ChevronUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="outline" onClick={() => index < contents.length - 1 && setContents((rows) => moveItem(rows, index, index + 1))}><ChevronDown className="h-4 w-4" /></Button>
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                      </div>
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={item.activo} onCheckedChange={(v) => setContents((rows) => rows.map((row) => row.id === item.id ? { ...row, activo: v === true } : row))} /> Activo</label>
                      <Button variant="destructive" onClick={async () => { try { await deletePantallaContenidoAction(item.id); if (selectedScreen) await loadContents(selectedScreen.id); } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo eliminar el contenido"); } }}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
                    </div>
                    <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setPreviewIndex(index)}>Previsualizar este</Button></div>
                    <a className="block text-xs text-muted-foreground underline" href={`/api/uploads/pantallas/${item.archivo}`} target="_blank" rel="noreferrer">{item.archivo}</a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
