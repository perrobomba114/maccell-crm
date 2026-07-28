"use client";

import { AlertTriangle, Droplets, KeyRound, PackageCheck } from "lucide-react";
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
            <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-2xl border-border bg-background p-0 shadow-2xl">
                <AlertDialogHeader className="border-b border-border/70 px-5 py-5 text-left">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <PackageCheck aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <AlertDialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                        Confirmar recepción
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm leading-6 text-muted-foreground">
                        Revisá estos datos con el cliente antes de registrar el equipo.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 px-5 py-5">
                    <div className="flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                        <KeyRound aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Acceso</p>
                            <p className="text-sm font-semibold text-foreground">{accessLabel}</p>
                        </div>
                    </div>
                    <div className="flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                        <PackageCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-cyan-500" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Accesorios</p>
                            <p className="text-sm font-semibold text-foreground">{accessoriesLabel}</p>
                        </div>
                    </div>
                    <div className={isWet
                        ? "flex min-h-14 items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3"
                        : "flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3"
                    }>
                        {isWet
                            ? <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-500" />
                            : <Droplets aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />}
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Humedad</p>
                            <p className="text-sm font-semibold text-foreground">
                                {isWet ? "Equipo declarado con humedad" : "Sin humedad declarada"}
                            </p>
                        </div>
                    </div>
                </div>
                <AlertDialogFooter className="gap-2 border-t border-border/70 bg-card/40 px-5 py-4 sm:space-x-0">
                    <AlertDialogCancel className="min-h-11 rounded-xl">
                        Volver a revisar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="min-h-11 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
                    >
                        Confirmar y registrar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
