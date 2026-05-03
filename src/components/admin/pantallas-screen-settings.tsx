"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ScreenRow } from "@/lib/pantallas/types";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";

export function PantallasScreenSettings({
  screen,
  pending,
  onSave,
}: {
  screen: ScreenRow;
  pending: boolean;
  onSave: (input: { id: string; nombre: string; duracion: number; activo: boolean }) => void;
}) {
  const [nombre, setNombre] = useState(screen.nombre);
  const [duracion, setDuracion] = useState(screen.duracion);

  useEffect(() => {
    setNombre(screen.nombre);
    setDuracion(screen.duracion);
  }, [screen.id, screen.nombre, screen.duracion]);

  return (
    <div className="rounded-xl border p-3 space-y-3">
      <div className="text-sm font-semibold">Configuración de pantalla</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="screen-name">Nombre</Label>
          <Input id="screen-name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Local 1" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="screen-duration">Duración imágenes (seg)</Label>
          <Input
            id="screen-duration"
            type="number"
            min={1}
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value) || 1)}
          />
        </div>
      </div>
      <Button
        onClick={() => onSave({ id: screen.id, nombre: nombre.trim(), duracion, activo: screen.activo })}
        disabled={pending || !nombre.trim()}
      >
        <Save className="mr-2 h-4 w-4" /> Guardar configuración
      </Button>
    </div>
  );
}
