"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

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
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base">Crear pantalla</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Nombre" value={form.nombre} onChange={(e) => onChange({ ...form, nombre: e.target.value })} />
        <Input type="number" min={1} value={form.duracion} onChange={(e) => onChange({ ...form, duracion: Number(e.target.value) || 1 })} />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.activo} onCheckedChange={(v) => onChange({ ...form, activo: v === true })} /> Activa
        </label>
        <Button className="w-full" onClick={onCreate} disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Crear pantalla
        </Button>
      </CardContent>
    </Card>
  );
}
