"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BackupFile, createBackup, deleteBackup, restoreBackup, uploadBackup } from "@/actions/backup";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Download, Trash2, RotateCcw, Upload, Database, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BackupClientProps {
    initialBackups: BackupFile[];
}

export function BackupClient({ initialBackups }: BackupClientProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [backups, setBackups] = useState(initialBackups); // Unused if we depend on router.refresh(), but kept for optimistic updates if needed.

    // Dialog states
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
    const [restoreConfirmation, setRestoreConfirmation] = useState("");

    const handleCreate = async () => {
        setIsLoading(true);
        toast.loading("Creando backup...", { id: "create-backup" });
        try {
            const res = await createBackup();
            if (res.success) {
                toast.success("Backup creado correctamente", { id: "create-backup" });
                router.refresh();
            } else {
                toast.error(res.error, { id: "create-backup" });
            }
        } catch (error) {
            toast.error("Error inesperado", { id: "create-backup" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        toast.loading("Eliminando...", { id: "delete-backup" });
        try {
            const res = await deleteBackup(deleteTarget);
            if (res.success) {
                toast.success("Backup eliminado", { id: "delete-backup" });
                router.refresh();
            } else {
                toast.error(res.error, { id: "delete-backup" });
            }
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleRestore = async () => {
        if (!restoreTarget) return;
        if (restoreConfirmation !== "RECUPERAR") {
            toast.error("Debes escribir RECUPERAR para confirmar");
            return;
        }

        setIsLoading(true);
        toast.loading("RESTAURANDO BASE DE DATOS... NO CIERRES ESTA VENTANA", { id: "restore-backup", duration: 100000 });

        try {
            const res = await restoreBackup(restoreTarget);
            if (res.success) {
                toast.success("Sistema restaurado con éxito. Se recargará la página.", { id: "restore-backup", duration: 5000 });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                toast.error(res.error, { id: "restore-backup" });
                setIsLoading(false);
            }
        } catch (error) {
            toast.error("Error crítico al restaurar", { id: "restore-backup" });
            setIsLoading(false);
        } finally {
            setRestoreTarget(null);
            setRestoreConfirmation("");
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        toast.loading("Subiendo backup...", { id: "upload-backup" });
        try {
            const res = await uploadBackup(formData);
            if (res.success) {
                toast.success("Backup subido correctamente", { id: "upload-backup" });
                router.refresh();
            } else {
                toast.error(res.error, { id: "upload-backup" });
            }
        } catch (error) {
            toast.error("Error al subir archivo", { id: "upload-backup" });
        } finally {
            // Reset input
            e.target.value = "";
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-800">Copias de Seguridad</h2>
                    <p className="text-muted-foreground">Gestiona los puntos de restauración del sistema.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            id="upload-backup"
                            accept=".sql"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={isLoading}
                        />
                        <label htmlFor="upload-backup">
                            <Button variant="outline" className="cursor-pointer" asChild disabled={isLoading}>
                                <span>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Subir Backup
                                </span>
                            </Button>
                        </label>
                    </div>
                    <Button onClick={handleCreate} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Crear Nuevo Backup
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre del Archivo</TableHead>
                            <TableHead>Fecha de Creación</TableHead>
                            <TableHead>Tamaño</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialBackups.map((backup) => (
                            <TableRow key={backup.name}>
                                <TableCell className="font-mono text-xs">{backup.name}</TableCell>
                                <TableCell>
                                    {format(new Date(backup.createdAt), "PPP p", { locale: es })}
                                </TableCell>
                                <TableCell>{formatBytes(backup.size)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={`/api/backups/${backup.name}`} download>
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-orange-500 hover:bg-orange-600 text-white"
                                        onClick={() => setRestoreTarget(backup.name)}
                                        disabled={isLoading}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setDeleteTarget(backup.name)}
                                        disabled={isLoading}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {initialBackups.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No hay copias de seguridad disponibles.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente el archivo de backup <b>{deleteTarget}</b>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
                <AlertDialogContent className="border-red-500 border-2">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <RotateCcw className="h-6 w-6" />
                            PELIGRO: RESTAURACIÓN DE SISTEMA
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p className="font-bold text-gray-900">
                                Vas a restaurar la base de datos al estado del archivo: <br />
                                <span className="font-mono bg-gray-100 p-1">{restoreTarget}</span>
                            </p>
                            <p className="text-red-600 font-semibold">
                                ESTA ACCIÓN ES DESTRUCTIVA.
                            </p>
                            <ul className="list-disc pl-5 text-sm">
                                <li>Se borrarán TODOS los datos actuales que no estén en el backup.</li>
                                <li>Se reemplazarán usuarios, productos, ventas y reparaciones.</li>
                                <li>No se puede deshacer.</li>
                            </ul>
                            <div className="pt-2">
                                <label className="text-xs font-semibold uppercase text-gray-500">
                                    Escribe "RECUPERAR" para confirmar:
                                </label>
                                <Input
                                    value={restoreConfirmation}
                                    onChange={(e) => setRestoreConfirmation(e.target.value)}
                                    placeholder="RECUPERAR"
                                    className="mt-1 border-red-300 focus:ring-red-500"
                                />
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar, me arrepentí</AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleRestore}
                            disabled={restoreConfirmation !== "RECUPERAR" || isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isLoading ? "Restaurando..." : "CONFIRMAR RESTAURACIÓN"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
