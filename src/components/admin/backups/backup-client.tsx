"use client";

import { createBackup, deleteBackup, restoreBackup, uploadBackup, type BackupFile } from "@/actions/backup";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AlertTriangle, Archive, Clock3, Database, HardDrive, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BackupMobileCard, BackupRow, MetricCard, formatBytes } from "./backup-ui";

type BackupAction = "create" | "upload" | "restore" | "delete" | null;

interface BackupClientProps {
    initialBackups: BackupFile[];
}

export function BackupClient({ initialBackups }: BackupClientProps) {
    const router = useRouter();
    const [activeAction, setActiveAction] = useState<BackupAction>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
    const [restoreConfirmation, setRestoreConfirmation] = useState("");

    const stats = useMemo(() => {
        const totalSize = initialBackups.reduce((acc, backup) => acc + backup.size, 0);
        const latest = initialBackups[0];
        return { totalSize, latest };
    }, [initialBackups]);

    const isBusy = activeAction !== null;
    const restoreBackupMeta = initialBackups.find((backup) => backup.name === restoreTarget);
    const deleteBackupMeta = initialBackups.find((backup) => backup.name === deleteTarget);

    const handleCreate = async () => {
        setActiveAction("create");
        toast.loading("Creando copia de seguridad...", { id: "create-backup" });
        try {
            const res = await createBackup();
            if (res.success) {
                toast.success("Backup creado correctamente", { id: "create-backup" });
                router.refresh();
            } else {
                toast.error(res.error, { id: "create-backup" });
            }
        } catch {
            toast.error("Error inesperado al crear backup", { id: "create-backup" });
        } finally {
            setActiveAction(null);
        }
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        setActiveAction("upload");
        toast.loading("Subiendo archivo .sql...", { id: "upload-backup" });
        try {
            const res = await uploadBackup(formData);
            if (res.success) {
                toast.success("Backup subido correctamente", { id: "upload-backup" });
                router.refresh();
            } else {
                toast.error(res.error, { id: "upload-backup" });
            }
        } catch {
            toast.error("Error al subir archivo", { id: "upload-backup" });
        } finally {
            setActiveAction(null);
            event.target.value = "";
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setActiveAction("delete");
        toast.loading("Eliminando backup...", { id: "delete-backup" });
        try {
            const res = await deleteBackup(deleteTarget);
            if (res.success) {
                toast.success("Backup eliminado", { id: "delete-backup" });
                router.refresh();
            } else {
                toast.error(res.error, { id: "delete-backup" });
            }
        } finally {
            setActiveAction(null);
            setDeleteTarget(null);
        }
    };

    const handleRestore = async () => {
        if (!restoreTarget) return;
        if (restoreConfirmation !== "RECUPERAR") {
            toast.error("Debés escribir RECUPERAR para confirmar");
            return;
        }

        setActiveAction("restore");
        toast.loading("Restaurando base de datos. No cierres esta ventana.", { id: "restore-backup", duration: 100000 });
        try {
            const res = await restoreBackup(restoreTarget);
            if (res.success) {
                toast.success("Sistema restaurado. La página se recargará.", { id: "restore-backup", duration: 5000 });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                toast.error(res.error || "No se pudo restaurar el backup", { id: "restore-backup", duration: 10000 });
                setActiveAction(null);
            }
        } catch {
            toast.error("Error crítico de red o servidor", { id: "restore-backup" });
            setActiveAction(null);
        } finally {
            setRestoreTarget(null);
            setRestoreConfirmation("");
        }
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-600" />
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                <Database className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Copias de seguridad</h2>
                                    <Badge variant="outline" className="rounded-md border-cyan-200 bg-cyan-50 text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300">
                                        Base de datos
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Creá, descargá o restaurá puntos de recuperación · usá restaurar solo ante incidentes reales.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="hidden sm:inline">Disponibles</span>
                            <Badge
                                variant="secondary"
                                className={`rounded-md font-semibold ${initialBackups.length > 0
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                    }`}
                            >
                                {initialBackups.length} copias
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 border-t bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 p-4 sm:p-5">
                    <input id="upload-backup" type="file" accept=".sql" className="hidden" onChange={handleUpload} disabled={isBusy} />
                    <Button
                        variant="outline"
                        className="h-12 gap-2 rounded-xl border-2 px-4 font-semibold shadow-sm transition-all hover:border-cyan-500/50 hover:shadow-md"
                        asChild
                        disabled={isBusy}
                    >
                        <label htmlFor="upload-backup" className="cursor-pointer">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                {activeAction === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </div>
                            Subir .sql
                        </label>
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={isBusy}
                        className="ml-auto h-12 gap-2 rounded-xl border-2 border-cyan-500 bg-gradient-to-br from-cyan-500 to-blue-600 px-4 font-semibold text-white shadow-sm transition-all hover:from-cyan-500 hover:to-blue-700 hover:shadow-md"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                            {activeAction === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                        </div>
                        Crear backup
                    </Button>
                </div>

                <div className="grid gap-6 border-t p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Backups guardados" value={String(initialBackups.length)} description="archivos .sql disponibles" icon={<Archive className="h-6 w-6" />} tone="emerald" />
                    <MetricCard title="Espacio usado" value={formatBytes(stats.totalSize)} description="tamaño total local" icon={<HardDrive className="h-6 w-6" />} tone="blue" />
                    <MetricCard title="Última copia" value={stats.latest ? format(new Date(stats.latest.createdAt), "dd/MM") : "Sin datos"} description={stats.latest ? format(new Date(stats.latest.createdAt), "HH:mm 'hs'") : "creá tu primer backup"} icon={<Clock3 className="h-6 w-6" />} tone="amber" />
                    <MetricCard title="Estado" value={initialBackups.length > 0 ? "Cubierto" : "Pendiente"} description={initialBackups.length > 0 ? "hay punto de recuperación" : "sin copia disponible"} icon={<ShieldCheck className="h-6 w-6" />} tone={initialBackups.length > 0 ? "purple" : "rose"} />
                </div>
            </section>

            <Card className="border bg-card shadow-sm">
                <CardHeader className="gap-2">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Database className="h-5 w-5 text-cyan-700" />
                        Historial de copias
                    </CardTitle>
                    <CardDescription>Descargá archivos, eliminá copias antiguas o restaurá un punto específico.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="hidden overflow-hidden rounded-lg border md:block">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Archivo</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tamaño</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialBackups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                                            No hay copias de seguridad disponibles.
                                        </TableCell>
                                    </TableRow>
                                ) : initialBackups.map((backup) => (
                                    <BackupRow key={backup.name} backup={backup} isBusy={isBusy} onDelete={setDeleteTarget} onRestore={setRestoreTarget} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="grid gap-3 md:hidden">
                        {initialBackups.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                                No hay copias de seguridad disponibles.
                            </div>
                        ) : initialBackups.map((backup) => (
                            <BackupMobileCard key={backup.name} backup={backup} isBusy={isBusy} onDelete={setDeleteTarget} onRestore={setRestoreTarget} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar copia de seguridad</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminará permanentemente <span className="font-mono font-semibold text-foreground">{deleteBackupMeta?.name || deleteTarget}</span>. Esta acción no borra datos del sistema, solo el archivo de backup.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar archivo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
                <AlertDialogContent className="border-destructive/50 border-2">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Restauración destructiva
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>Vas a restaurar la base al estado de este archivo:</p>
                                <div className="rounded-md border bg-muted p-3 font-mono text-xs text-foreground break-all">
                                    {restoreBackupMeta?.name || restoreTarget}
                                </div>
                                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">
                                    Se reemplazarán usuarios, productos, ventas, reparaciones y movimientos posteriores a esa copia.
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Escribí RECUPERAR para confirmar</label>
                                    <Input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} placeholder="RECUPERAR" className="border-destructive/30 focus-visible:ring-destructive" />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <Button variant="destructive" onClick={handleRestore} disabled={restoreConfirmation !== "RECUPERAR" || isBusy}>
                            {activeAction === "restore" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmar restauración
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
