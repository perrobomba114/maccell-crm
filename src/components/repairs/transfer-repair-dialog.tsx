"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Share2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getTechnicians } from "@/actions/user-actions";
import { transferRepairAction } from "@/lib/actions/repairs";

interface TransferRepairDialogProps {
    repair: { id: string; ticketNumber: string };
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function TransferRepairDialog({ repair, currentUserId, isOpen, onClose }: TransferRepairDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [technicians, setTechnicians] = useState<{ id: string, name: string }[]>([]);
    const [selectedTechId, setSelectedTechId] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setSelectedTechId("");
        setIsFetchingUsers(true);
        const fetchTechnicians = async () => {
            try {
                const result = await getTechnicians();
                if (cancelled) return;
                if (result.success && result.technicians) {
                    setTechnicians(result.technicians.filter(t => t.id !== currentUserId));
                } else {
                    toast.error("Error al cargar la lista de técnicos");
                }
            } catch {
                if (!cancelled) toast.error("Error inesperado al cargar técnicos");
            } finally {
                if (!cancelled) setIsFetchingUsers(false);
            }
        };
        void fetchTechnicians();
        return () => { cancelled = true; };
    }, [isOpen, currentUserId]);

    const handleTransfer = async () => {
        if (!selectedTechId) {
            toast.error("Por favor seleccione un técnico");
            return;
        }

        setIsLoading(true);
        try {
            const result = await transferRepairAction(repair.id, currentUserId, selectedTechId);
            if (result.success) {
                toast.success("Reparación transferida con éxito");
                onClose();
                router.refresh();
            } else {
                toast.error(result.error || "Error al transferir");
            }
        } catch {
            toast.error("Error inesperado");
        } finally {
            setIsLoading(false);
        }
    };

    if (!repair) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-blue-500" />
                        Transferir Reparación
                    </DialogTitle>
                    <DialogDescription>
                        <span>{`Reasignar el ticket #${repair.ticketNumber} a otro técnico.`}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 rounded-md flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                            Usa esta opción si no puedes completar la reparación y necesitas que un colega se haga cargo.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="technician">Seleccionar Técnico Destino</Label>
                        <select
                            id="technician"
                            disabled={isLoading || isFetchingUsers}
                            onChange={(event) => setSelectedTechId(event.target.value)}
                            value={selectedTechId}
                            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                        >
                            <option value="" disabled>
                                {isFetchingUsers ? "Cargando..." : "Elegir técnico..."}
                            </option>
                            {technicians.map((tech) => (
                                <option key={tech.id} value={tech.id}>{tech.name}</option>
                            ))}
                        </select>
                        {technicians.length === 0 && !isFetchingUsers && (
                            <p className="text-sm text-muted-foreground">No hay otros técnicos disponibles</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleTransfer}
                        disabled={isLoading || isFetchingUsers || !selectedTechId}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <span>Confirmar Transferencia</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
