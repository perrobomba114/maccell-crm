"use client";

import {
  createPantallaAction,
  deletePantallaContenidoAction,
  getPantallaContentsAction,
  savePantallaContenidosAction,
  updatePantallaAction,
} from "@/actions/pantallas-actions";
import { PantallasContentList } from "@/components/admin/pantallas-content-list";
import { PantallasCreateForm } from "@/components/admin/pantallas-create-form";
import { PantallasPreviewPanel } from "@/components/admin/pantallas-preview-panel";
import { PantallasScreenList } from "@/components/admin/pantallas-screen-list";
import { PantallasScreenSettings } from "@/components/admin/pantallas-screen-settings";
import { PantallasSummaryPanel } from "@/components/admin/pantallas-summary-panel";
import { PantallasToolsPanel } from "@/components/admin/pantallas-tools-panel";
import { PantallasUploadPanel } from "@/components/admin/pantallas-upload-panel";
import { usePantallasUpload } from "@/components/admin/use-pantallas-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PantallaMetricRow, type PantallasAdminSummary } from "@/lib/pantallas/admin-tools";
import { type ContentRow, type ScreenRow } from "@/lib/pantallas/types";
import { Monitor, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

type ScreenWithCount = ScreenRow & { contenidos: number };

function moveItem<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
  return next;
}

export function PantallasClient({
  initialMetrics,
  initialScreens,
  initialSummary,
}: {
  initialMetrics: PantallaMetricRow[];
  initialScreens: ScreenWithCount[];
  initialSummary: PantallasAdminSummary;
}) {
  const [screens, setScreens] = useState(initialScreens);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(initialScreens[0]?.id ?? null);
  const [screenForm, setScreenForm] = useState({ nombre: "", duracion: 15, activo: true });
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [pending, startTransition] = useTransition();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAutoPlay, setPreviewAutoPlay] = useState(true);

  const selectedScreen = useMemo(() => screens.find((s) => s.id === selectedScreenId) ?? null, [screens, selectedScreenId]);
  const previewItem = contents[previewIndex] ?? null;
  const [isSaving, setIsSaving] = useState(false);
  const { clearUploadProgress, uploadContents, uploadProgress } = usePantallasUpload({
    screenId: selectedScreen?.id ?? null,
    onUploaded: async (successCount) => {
      if (!selectedScreen) return;
      await loadContents(selectedScreen.id);
      setScreens((rows) => rows.map((screen) => (
        screen.id === selectedScreen.id ? { ...screen, contenidos: screen.contenidos + successCount } : screen
      )));
    },
  });

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

  async function saveContents(nextContents = contents) {
    setIsSaving(true);
    startTransition(async () => {
      try {
        await savePantallaContenidosAction(
          nextContents.map((item, index) => ({
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

  async function deleteContent(contentId: string) {
    if (!selectedScreen) return;
    try {
      await deletePantallaContenidoAction(contentId);
      await loadContents(selectedScreen.id);
      setScreens((rows) => rows.map((screen) => (
        screen.id === selectedScreen.id ? { ...screen, contenidos: Math.max(0, screen.contenidos - 1) } : screen
      )));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo eliminar el contenido");
    }
  }

  function renameContent(contentId: string, titulo: string) {
    const next = contents.map((row) => row.id === contentId ? { ...row, titulo } : row);
    setContents(next);
  }

  function reorderContent(from: number, to: number) {
    const next = moveItem(contents, from, to);
    setContents(next);
    void saveContents(next);
  }

  function toggleContent(contentId: string, activo: boolean) {
    const next = contents.map((row) => row.id === contentId ? { ...row, activo } : row);
    setContents(next);
    void saveContents(next);
  }

  function nextPreview() {
    setPreviewIndex((i) => (i + 1) % Math.max(contents.length, 1));
  }

  useEffect(() => {
    clearUploadProgress();
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
  }, [selectedScreenId, clearUploadProgress]);

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

      <PantallasSummaryPanel summary={initialSummary} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <PantallasCreateForm form={screenForm} disabled={pending || isSaving} onChange={setScreenForm} onCreate={createScreen} />

          <PantallasScreenList screens={screens} selectedScreenId={selectedScreenId} onSelect={setSelectedScreenId} onRefresh={refreshScreens} />
        </div>

        <Card className="min-h-[70vh]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Monitor className="h-4 w-4" />{selectedScreen ? `Contenidos de ${selectedScreen.nombre}` : "Seleccioná una pantalla"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedScreen && (
              <PantallasPreviewPanel
                screen={selectedScreen}
                contents={contents}
                previewItem={previewItem}
                previewAutoPlay={previewAutoPlay}
                onAutoplayChange={setPreviewAutoPlay}
                onNext={nextPreview}
              />
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

            {selectedScreen && <PantallasUploadPanel progress={uploadProgress} onFiles={(files) => void uploadContents(files)} />}

            {selectedScreen && (
              <PantallasToolsPanel
                screens={screens}
                selectedScreen={selectedScreen}
                initialMetrics={initialMetrics}
                onRefresh={refreshScreens}
              />
            )}

            {loadingContents && <div className="text-sm text-muted-foreground">Cargando contenidos...</div>}
            {!loadingContents && selectedScreen && contents.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Esta pantalla aún no tiene contenidos.</div>}

            {!loadingContents && contents.length > 0 && (
              <PantallasContentList
                contents={contents}
                onRename={renameContent}
                onRenameCommit={() => void saveContents()}
                onReorder={reorderContent}
                onToggle={toggleContent}
                onDelete={(id) => void deleteContent(id)}
                onPreview={setPreviewIndex}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
