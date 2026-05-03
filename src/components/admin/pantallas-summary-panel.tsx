"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { type PantallasAdminSummary } from "@/lib/pantallas/admin-tools";
import { AlertTriangle, FileStack, Link2Off, MonitorPause, Radio, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PantallasSummaryPanel({ summary }: { summary: PantallasAdminSummary }) {
  return (
    <div className="space-y-3">
      {summary.alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pantallas offline</AlertTitle>
          <AlertDescription>
            {summary.alerts.map((alert) => `${alert.screenName} hace ${alert.minutesOffline} min`).join(" · ")}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
        <SummaryValue label="Online" value={summary.online} meta="Con heartbeat" gradient="from-emerald-500 to-emerald-700" text="text-emerald-100" icon={<Radio className="h-6 w-6 text-white" />} />
        <SummaryValue label="Offline" value={summary.offline} meta="Sin señal reciente" gradient="from-rose-500 to-red-700" text="text-rose-100" icon={<WifiOff className="h-6 w-6 text-white" />} />
        <SummaryValue label="Sin vincular" value={summary.unlinked} meta="Requieren APK" gradient="from-amber-400 to-orange-600" text="text-amber-100" icon={<Link2Off className="h-6 w-6 text-white" />} />
        <SummaryValue label="Pausadas" value={summary.paused} meta="No publican" gradient="from-blue-500 to-indigo-600" text="text-blue-100" icon={<MonitorPause className="h-6 w-6 text-white" />} />
        <SummaryValue label="Sin contenidos" value={summary.withoutContents} meta="Playlist vacía" gradient="from-purple-500 to-pink-600" text="text-purple-100" icon={<AlertTriangle className="h-6 w-6 text-white" />} />
        <SummaryValue label="Contenidos" value={summary.totalContents} meta="Archivos cargados" gradient="from-sky-500 to-cyan-600" text="text-sky-100" icon={<FileStack className="h-6 w-6 text-white" />} />
      </div>
    </div>
  );
}

function SummaryValue({ label, value, meta, gradient, text, icon }: { label: string; value: number; meta: string; gradient: string; text: string; icon: ReactNode }) {
  return (
    <Card className={cn("relative overflow-hidden border-none bg-gradient-to-br text-white shadow-lg", gradient)}>
      <CardContent className="flex min-h-[180px] flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <p className={cn("line-clamp-2 min-h-[2.5rem] text-sm font-medium", text)}>{label}</p>
          <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm">{icon}</div>
        </div>
        <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</h3>
        <div className={cn("mt-auto pt-4 text-sm", text)}>{meta}</div>
      </CardContent>
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
    </Card>
  );
}
