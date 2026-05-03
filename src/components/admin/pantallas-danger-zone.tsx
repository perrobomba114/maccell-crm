"use client";

import { deletePantallaAction, regeneratePantallaKeyAction, updatePantallaAction } from "@/actions/pantallas-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { type ScreenRow } from "@/lib/pantallas/types";
import { PauseCircle, Power, RotateCcw, Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

export function PantallasDangerZone({ screen, onRefresh }: { screen: ScreenRow; onRefresh: () => Promise<void> }) {
  const [confirmName, setConfirmName] = useState("");
  const [pending, startTransition] = useTransition();

  const runAction = (action: () => Promise<void>, message: string) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(message);
        await onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
      }
    });
  };

  return (
    <Card className="border-rose-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-rose-700 dark:text-rose-400">Zona de acciones críticas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <ConfirmAction
          title={screen.activo ? "Pausar pantalla" : "Activar pantalla"}
          description={screen.activo ? "La TV dejará de mostrar publicidades activas hasta que la vuelvas a activar." : "La TV volverá a pedir y mostrar su playlist activa."}
          confirmLabel={screen.activo ? "Pausar" : "Activar"}
          icon={screen.activo ? <PauseCircle className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          disabled={pending}
          onConfirm={() => runAction(
            () => updatePantallaAction({ id: screen.id, nombre: screen.nombre, duracion: screen.duracion, activo: !screen.activo }),
            screen.activo ? "Pantalla pausada" : "Pantalla activada"
          )}
        />

        <ConfirmAction
          title="Reset vínculo"
          description="Desvincula la TV. Después vas a tener que abrir la APK y vincular este local otra vez."
          confirmLabel="Reset vínculo"
          icon={<RotateCcw className="h-4 w-4" />}
          disabled={pending}
          onConfirm={() => runAction(async () => { await regeneratePantallaKeyAction(screen.id); }, "Vínculo reseteado")}
        />

        <AlertDialog onOpenChange={(open) => !open && setConfirmName("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={pending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar pantalla y contenidos</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción borra la pantalla seleccionada. Para confirmar, escribí exactamente: {screen.nombre}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmName} onChange={(event) => setConfirmName(event.target.value)} placeholder={screen.nombre} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmName !== screen.nombre}
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => runAction(() => deletePantallaAction(screen.id), "Pantalla eliminada")}
              >
                Eliminar definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function ConfirmAction({
  title,
  description,
  confirmLabel,
  icon,
  disabled,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  icon: ReactNode;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {icon}
          <span className="ml-2">{confirmLabel}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
