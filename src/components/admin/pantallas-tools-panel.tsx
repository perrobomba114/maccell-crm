"use client";

import {
  cleanupPantallaOrphansAction,
  duplicatePantallaPlaylistAction,
  getPantallaDiagnosticsAction,
  getPantallaMetricsAction,
} from "@/actions/pantallas-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type PantallaDiagnostics, type PantallaMetricRow } from "@/lib/pantallas/admin-tools";
import { type ScreenRow } from "@/lib/pantallas/types";
import { Copy, SearchCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

type ScreenWithCount = ScreenRow & { contenidos: number };

export function PantallasToolsPanel({
  screens,
  selectedScreen,
  initialMetrics,
  onRefresh,
}: {
  screens: ScreenWithCount[];
  selectedScreen: ScreenWithCount;
  initialMetrics: PantallaMetricRow[];
  onRefresh: () => Promise<void>;
}) {
  const [targetScreenId, setTargetScreenId] = useState("");
  const [diagnostics, setDiagnostics] = useState<PantallaDiagnostics | null>(null);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [orphansLabel, setOrphansLabel] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedMetric = metrics.find((metric) => metric.screenId === selectedScreen.id);

  function runDiagnostics() {
    startTransition(async () => {
      setDiagnostics(await getPantallaDiagnosticsAction(selectedScreen.id));
      setMetrics(await getPantallaMetricsAction());
    });
  }

  function duplicatePlaylist() {
    if (!targetScreenId) return;
    const targetName = screens.find((screen) => screen.id === targetScreenId)?.nombre ?? "la pantalla elegida";
    const confirmed = window.confirm(
      `Esto va a agregar la playlist de ${selectedScreen.nombre} a ${targetName}. No reemplaza contenidos existentes. ¿Continuar?`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const count = await duplicatePantallaPlaylistAction({ sourceScreenId: selectedScreen.id, targetScreenId });
        window.alert(`Se copiaron ${count} contenidos.`);
        await onRefresh();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "No se pudo copiar la playlist");
      }
    });
  }

  function cleanupOrphans() {
    startTransition(async () => {
      const preview = await cleanupPantallaOrphansAction({ dryRun: true });
      const totalMb = preview.reduce((sum, item) => sum + item.size, 0) / 1024 / 1024;
      if (!preview.length) {
        setOrphansLabel("No hay archivos huérfanos.");
        return;
      }
      const sample = preview.slice(0, 8).map((item) => item.path).join("\n");
      const more = preview.length > 8 ? `\n...y ${preview.length - 8} más` : "";
      const confirmed = window.confirm(
        `Hay ${preview.length} archivos huérfanos (${totalMb.toFixed(1)} MB).\n\n${sample}${more}\n\n¿Borrarlos definitivamente?`
      );
      if (!confirmed) {
        setOrphansLabel(`${preview.length} archivos huérfanos detectados, sin borrar.`);
        return;
      }
      const deleted = await cleanupPantallaOrphansAction({
        confirmDelete: "DELETE_ORPHAN_PANTALLA_FILES",
        dryRun: false,
      });
      setOrphansLabel(`Se borraron ${deleted.length} archivos huérfanos.`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Herramientas de pantalla</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Syncs hoy" value={selectedMetric?.syncsToday ?? 0} />
          <Metric label="Última conexión" value={selectedMetric?.minutesSinceLastSeen === null ? "Nunca" : `${selectedMetric?.minutesSinceLastSeen ?? 0} min`} />
          <Metric label="Contenidos" value={selectedScreen.contenidos} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={runDiagnostics} disabled={pending}>
            <SearchCheck className="mr-2 h-4 w-4" />
            Diagnóstico
          </Button>
          <Button variant="outline" onClick={cleanupOrphans} disabled={pending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Limpiar huérfanos
          </Button>
        </div>

        {diagnostics && (
          <div className="rounded-lg border p-3 text-sm">
            <div className="mb-2 font-semibold">Diagnóstico de {diagnostics.screenName}</div>
            <div className="space-y-1">
              {diagnostics.checks.map((check) => (
                <div key={check.label} className="flex flex-wrap items-center gap-2">
                  <span className={check.ok ? "text-emerald-500" : "text-destructive"}>{check.ok ? "OK" : "Revisar"}</span>
                  <span className="font-medium">{check.label}:</span>
                  <span className="text-muted-foreground">{check.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Select value={targetScreenId} onValueChange={setTargetScreenId}>
            <SelectTrigger>
              <SelectValue placeholder="Copiar playlist a..." />
            </SelectTrigger>
            <SelectContent>
              {screens.filter((screen) => screen.id !== selectedScreen.id).map((screen) => (
                <SelectItem key={screen.id} value={screen.id}>{screen.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={duplicatePlaylist} disabled={pending || !targetScreenId}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </Button>
        </div>
        {orphansLabel && <div className="text-xs text-muted-foreground">{orphansLabel}</div>}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
