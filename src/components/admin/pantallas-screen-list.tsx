"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIMEZONE } from "@/lib/date-utils";
import { getPantallaConnectionLabel, getPantallaConnectionStatus, getPantallaOfflineMinutes } from "@/lib/pantallas/status";
import { type ScreenRow } from "@/lib/pantallas/types";
import { MapPin, Monitor, Wifi, WifiOff } from "lucide-react";

type ScreenWithCount = ScreenRow & { contenidos: number };

function fmtDate(date: Date | null) {
  if (!date) return "Nunca";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: TIMEZONE }).format(new Date(date));
}

export function PantallasScreenList({
  screens,
  selectedScreenId,
  onSelect,
}: {
  screens: ScreenWithCount[];
  selectedScreenId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden border-blue-500/20 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 pb-4">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <MapPin className="h-5 w-5" />
          </span>
          Elegí el local
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
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
              className={`w-full rounded-xl border p-4 text-left shadow-sm transition ${selectedScreenId === screen.id ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30" : "border-border bg-card hover:border-blue-500/40 hover:bg-blue-500/5"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate font-semibold leading-tight">
                    <Monitor className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="truncate">{screen.nombre}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {screen.contenidos} contenidos • {screen.duracion}s por imagen
                  </div>
                </div>
                <Badge variant={isOnline ? "default" : "secondary"}>{statusLabel}</Badge>
              </div>

              {!screen.activo && (
                <div className="mt-2 text-xs font-bold text-amber-600">Pausada</div>
              )}
              {screen.contenidos === 0 && (
                <div className="mt-2 text-xs font-medium text-orange-500">Sin contenidos</div>
              )}

              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5" />}
                {fmtDate(screen.lastseen)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
