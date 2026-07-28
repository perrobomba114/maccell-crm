"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RepairCreateConfirmDialogProps {
    open: boolean;
    accessLabel: string;
    accessoriesLabel: string;
    isWet: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function RepairCreateConfirmDialog({
    open,
    accessLabel,
    accessoriesLabel,
    isWet,
    onOpenChange,
    onConfirm,
}: RepairCreateConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[95vw] border-2 border-zinc-800 bg-zinc-950 p-6 sm:max-w-5xl sm:p-10">
                <AlertDialogHeader className="flex flex-col items-center justify-center">
                    <AlertDialogTitle className="flex flex-col items-center justify-center gap-2 text-center text-xl font-black uppercase tracking-tighter text-yellow-500 sm:flex-row sm:gap-3 sm:text-3xl">
                        <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12" />
                        Confirmar recepción
                    </AlertDialogTitle>
                    <AlertDialogDescription className="w-full space-y-6 pt-4">
                        <Alert className="flex flex-col items-center border-yellow-500/50 bg-yellow-500/10 p-6 text-center">
                            <AlertTriangle className="mb-4 h-10 w-10 text-yellow-500" />
                            <AlertTitle className="mb-4 block text-2xl font-bold text-yellow-500">RESUMEN OBLIGATORIO</AlertTitle>
                            <AlertDescription className="w-full text-xl font-medium leading-relaxed text-yellow-100/90">
                                <ul className="mx-auto mt-3 inline-block list-disc space-y-3 text-left text-lg font-bold text-yellow-400">
                                    <li>{accessLabel}</li>
                                    <li>Accesorios: {accessoriesLabel}</li>
                                    <li>{isWet ? "Equipo declarado con humedad" : "Equipo sin humedad declarada"}</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                        <p className="text-center text-lg italic text-zinc-400">Verificá estos datos con el cliente antes de registrar.</p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
                    <AlertDialogCancel className="h-14 w-full border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 sm:h-16 sm:w-1/2">
                        VOLVER A LOS DATOS
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="h-14 w-full whitespace-normal bg-yellow-500 text-base font-black text-black shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:bg-yellow-400 sm:h-16 sm:w-1/2 sm:text-xl"
                    >
                        SÍ, TODO VERIFICADO - REGISTRAR
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
