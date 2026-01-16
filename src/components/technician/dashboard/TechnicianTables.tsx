"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Microscope, Clock } from "lucide-react";
import Link from "next/link";

interface ActiveWorkspaceProps {
    data: { id: string; ticketNumber: string; device: string; problem: string; startedAt: Date; estimatedTime: number; statusName: string; statusColor: string }[];
}

export function ActiveWorkspaceTable({ data }: ActiveWorkspaceProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const formatTime = (date: Date) => {
        if (!date || !isMounted) return "--:--";
        return new Date(date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Card className="col-span-4 border-none shadow-lg border-l-4 border-l-blue-600 bg-blue-50/10 dark:bg-blue-900/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Microscope className="h-6 w-6" />
                    Mesa de Trabajo
                </CardTitle>
                <CardDescription>Equipos actualmente en proceso de reparación</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ticket</TableHead>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Problema</TableHead>
                            <TableHead>Inicio</TableHead>
                            <TableHead>Estimado</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id} className="bg-white/50 dark:bg-black/20">
                                <TableCell className="font-mono font-bold">{item.ticketNumber}</TableCell>
                                <TableCell className="font-medium">{item.device}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={item.problem}>
                                    {item.problem}
                                </TableCell>
                                <TableCell className="text-sm">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        {formatTime(item.startedAt)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                    {item.estimatedTime ? `${item.estimatedTime} min` : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/technician/repairs/${item.id}`}>
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                            Continuar
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-3 rounded-full bg-muted">
                                            <Pause className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <p>No tienes equipos en proceso.</p>
                                        <p className="text-xs">Toma uno de la cola para comenzar.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

interface QueueTableProps {
    data: { id: string; ticketNumber: string; device: string; problem: string; createdAt: Date; statusName: string; statusColor: string }[];
}

export function QueueTable({ data }: QueueTableProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const formatDate = (date: Date) => {
        if (!isMounted) return "...";
        return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    };

    return (
        <Card className="col-span-4 lg:col-span-2 border-none shadow-md">
            <CardHeader>
                <CardTitle className="text-lg">Próximos en Cola</CardTitle>
                <CardDescription>Asignados pendientes</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Detalle</TableHead>
                            <TableHead className="text-right">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <TableCell className="py-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold bg-muted px-1 rounded">{item.ticketNumber}</span>
                                            <span className="font-medium text-sm">{item.device}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.problem}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-3">
                                    <Badge variant="outline" style={{ borderColor: item.statusColor, color: item.statusColor }}>
                                        {item.statusName}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                                    Cola vacía. ¡Buen trabajo!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
