"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonitorUp, Plus } from "lucide-react";

export function PantallasCreateForm({
  form,
  disabled,
  onChange,
  onCreate,
}: {
  form: { nombre: string; duracion: number; activo: boolean };
  disabled: boolean;
  onChange: (form: { nombre: string; duracion: number; activo: boolean }) => void;
  onCreate: () => void;
}) {
  return (
    <Card className="overflow-hidden border-blue-500/20 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 pb-4">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <MonitorUp className="h-5 w-5" />
          </span>
          Nueva pantalla
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="pantalla-nombre">Local o ubicación</Label>
          <Input
            id="pantalla-nombre"
            placeholder="Ej: Local Rivadavia 598"
            value={form.nombre}
            onChange={(e) => onChange({ ...form, nombre: e.target.value })}
            className="h-11 border-2 focus-visible:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pantalla-duracion">Duración de imagen</Label>
          <Input
            id="pantalla-duracion"
            type="number"
            min={1}
            value={form.duracion}
            onChange={(e) => onChange({ ...form, duracion: Number(e.target.value) || 1 })}
            className="h-11 border-2 font-mono focus-visible:ring-blue-500"
          />
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-3 text-sm">
          <span className="font-medium">Crear activa</span>
          <Checkbox checked={form.activo} onCheckedChange={(v) => onChange({ ...form, activo: v === true })} />
        </label>
        <Button className="h-11 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700" onClick={onCreate} disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Crear pantalla
        </Button>
      </CardContent>
    </Card>
  );
}
