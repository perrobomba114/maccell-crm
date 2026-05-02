"use client";

import type { BackupFile } from "@/actions/backup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Database, Download, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatBackupDate(date: Date) {
    return format(new Date(date), "dd MMM yyyy · HH:mm 'hs'", { locale: es });
}

const metricToneClass = {
    emerald: { gradient: "from-emerald-500 to-emerald-700", mutedText: "text-emerald-100" },
    blue: { gradient: "from-blue-500 to-indigo-600", mutedText: "text-blue-100" },
    amber: { gradient: "from-amber-400 to-orange-600", mutedText: "text-amber-100" },
    purple: { gradient: "from-purple-500 to-pink-600", mutedText: "text-purple-100" },
    rose: { gradient: "from-rose-500 to-red-700", mutedText: "text-rose-100" },
};

type MetricTone = keyof typeof metricToneClass;

export function MetricCard({ title, value, description, icon, tone = "blue" }: { title: string; value: string; description: string; icon: ReactNode; tone?: MetricTone }) {
    const { gradient, mutedText } = metricToneClass[tone];

    return (
        <Card className={`relative overflow-hidden border-none bg-gradient-to-br ${gradient} text-white shadow-lg`}>
            <CardContent className="flex min-h-[178px] flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className={`mb-1 text-sm font-medium ${mutedText}`}>{title}</p>
                        <h3 className="truncate text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</h3>
                    </div>
                    <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">{icon}</div>
                </div>
                <p className={`mt-auto pt-4 text-sm ${mutedText}`}>{description}</p>
            </CardContent>
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </Card>
    );
}

export function BackupRow({ backup, isBusy, onDelete, onRestore }: { backup: BackupFile; isBusy: boolean; onDelete: (name: string) => void; onRestore: (name: string) => void }) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-md bg-muted p-2"><Database className="h-4 w-4 text-muted-foreground" /></div>
                    <span className="truncate font-mono text-xs font-semibold">{backup.name}</span>
                </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatBackupDate(backup.createdAt)}</TableCell>
            <TableCell className="font-mono text-sm">{formatBytes(backup.size)}</TableCell>
            <TableCell className="text-right"><BackupActions backup={backup} isBusy={isBusy} onDelete={onDelete} onRestore={onRestore} /></TableCell>
        </TableRow>
    );
}

export function BackupMobileCard({ backup, isBusy, onDelete, onRestore }: { backup: BackupFile; isBusy: boolean; onDelete: (name: string) => void; onRestore: (name: string) => void }) {
    return (
        <article className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="break-all font-mono text-xs font-bold">{backup.name}</p>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatBackupDate(backup.createdAt)}</span>
                <span className="font-mono">{formatBytes(backup.size)}</span>
            </div>
            <Separator className="my-4" />
            <BackupActions backup={backup} isBusy={isBusy} onDelete={onDelete} onRestore={onRestore} fullWidth />
        </article>
    );
}

function BackupActions({ backup, isBusy, onDelete, onRestore, fullWidth = false }: { backup: BackupFile; isBusy: boolean; onDelete: (name: string) => void; onRestore: (name: string) => void; fullWidth?: boolean }) {
    return (
        <div className={fullWidth ? "grid grid-cols-3 gap-2" : "inline-flex gap-2"}>
            <Button variant="outline" size="sm" asChild>
                <a href={`/api/backups/${backup.name}`} download title="Descargar backup">
                    <Download className="h-4 w-4" />
                </a>
            </Button>
            <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30" onClick={() => onRestore(backup.name)} disabled={isBusy} title="Restaurar backup">
                <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30" onClick={() => onDelete(backup.name)} disabled={isBusy} title="Eliminar backup">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}
