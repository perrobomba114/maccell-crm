"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { type PantallasAdminSummary } from "@/lib/pantallas/admin-tools";
import { AlertTriangle } from "lucide-react";

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
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryValue label="Online" value={summary.online} tone="text-emerald-500" />
          <SummaryValue label="Offline" value={summary.offline} tone="text-destructive" />
          <SummaryValue label="Sin vincular" value={summary.unlinked} tone="text-amber-500" />
          <SummaryValue label="Pausadas" value={summary.paused} tone="text-muted-foreground" />
          <SummaryValue label="Sin contenidos" value={summary.withoutContents} tone="text-orange-500" />
          <SummaryValue label="Contenidos" value={summary.totalContents} tone="text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryValue({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className={`text-2xl font-black leading-none ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
