"use client";

import { regeneratePantallaKeyAction, updatePantallaAction, deletePantallaAction } from "@/actions/pantallas-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIMEZONE } from "@/lib/date-utils";
import { getPantallaConnectionLabel, getPantallaConnectionStatus, getPantallaOfflineMinutes } from "@/lib/pantallas/status";
import { type ScreenRow } from "@/lib/pantallas/types";
import { Trash2, Wifi, WifiOff } from "lucide-react";
import { useTransition } from "react";

type ScreenWithCount = ScreenRow & { contenidos: number };

function fmtDate(date: Date | null) {
  if (!date) return "Nunca";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: TIMEZONE }).format(new Date(date));
}

export function PantallasScreenList({
  screens,
  selectedScreenId,
  onSelect,
  onRefresh,
}: {
  screens: ScreenWithCount[];
  selectedScreenId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pantallas ({screens.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {screens.map((screen) => {
          const connectionStatus = getPantallaConnectionStatus(screen);
          const isOnline = connectionStatus === "online";
          const offlineMinutes = getPantallaOfflineMinutes(screen);
          const statusLabel = offlineMinutes && connectionStatus === "offline"
            ? `Offline hace ${offlineMinutes} min`
            : getPantallaConnectionLabel(connectionStatus);

          return (
            <div
              role="button"
              tabIndex={0}
              key={screen.id}
              onClick={() => onSelect(screen.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(screen.id);
                }
              }}
              className={`w-full rounded-lg border p-3 text-left transition ${selectedScreenId === screen.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold leading-tight">{screen.nombre}</div>
                  <div className="text-xs text-muted-foreground">{screen.contenidos} contenidos • {screen.duracion}s</div>
                </div>
                <Badge variant={isOnline ? "default" : "secondary"}>{statusLabel}</Badge>
              </div>

              {screen.contenidos === 0 && (
                <div className="mt-2 text-xs font-medium text-orange-500">Sin contenidos</div>
              )}

              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5" />}
                {fmtDate(screen.lastseen)}
              </div>

              <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await updatePantallaAction({ id: screen.id, nombre: screen.nombre, duracion: screen.duracion, activo: !screen.activo });
                        await onRefresh();
                      } catch (error) {
                        window.alert(error instanceof Error ? error.message : "No se pudo actualizar la pantalla");
                      }
                    })
                  }
                >
                  {screen.activo ? "Pausar" : "Activar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await regeneratePantallaKeyAction(screen.id);
                        window.alert("Pantalla desvinculada. Abrí la APK y seleccioná esta pantalla para vincularla de nuevo.");
                        await onRefresh();
                      } catch (error) {
                        window.alert(error instanceof Error ? error.message : "No se pudo desvincular la pantalla");
                      }
                    })
                  }
                >
                  Reset vínculo
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (!window.confirm("¿Eliminar pantalla y contenidos?")) return;
                    startTransition(async () => {
                      try {
                        await deletePantallaAction(screen.id);
                        await onRefresh();
                      } catch (error) {
                        window.alert(error instanceof Error ? error.message : "No se pudo eliminar la pantalla");
                      }
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
