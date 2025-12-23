"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Replenishment Needs Table ---
interface ReplenishmentProps {
    data: {
        product: string;
        branch: string;
        quantity: number;
    }[];
}

export function ReplenishmentTable({ data }: ReplenishmentProps) {
    return (
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm ring-1 ring-white/10 dark:ring-white/5 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-border/50">
                <CardTitle className="text-red-500 font-bold">⚠️ Requerido Stock</CardTitle>
                <CardDescription>Productos con stock crítico ({"<"} 3)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[350px] overflow-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-md z-10">
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead>Producto</TableHead>
                                <TableHead>Sucursal</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, i) => (
                                <TableRow key={i} className="border-border/50 hover:bg-muted/30">
                                    <TableCell className="font-medium text-xs md:text-sm">{item.product}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{item.branch}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="destructive" className="font-mono shadow-sm shadow-red-500/20">{item.quantity}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                        Todo en orden. No hay alertas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// --- Best Technicians Table ---
interface TechnicianProps {
    data: {
        name: string;
        repairs: number;
    }[];
}

export function TechnicianTable({ data }: TechnicianProps) {
    return (
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm ring-1 ring-white/10 dark:ring-white/5 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-border/50">
                <CardTitle className="text-blue-500 font-bold">🏆 Mejores Técnicos</CardTitle>
                <CardDescription>Líderes en reparaciones este mes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[350px] overflow-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-md z-10">
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="pl-6">Técnico</TableHead>
                                <TableHead className="text-right pr-6">Reparaciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, i) => (
                                <TableRow key={i} className="border-border/50 hover:bg-muted/30">
                                    <TableCell className="font-medium pl-6 flex items-center gap-2">
                                        {i === 0 && <span className="text-lg">🥇</span>}
                                        {i === 1 && <span className="text-lg">🥈</span>}
                                        {i === 2 && <span className="text-lg">🥉</span>}
                                        <span className={cn(i < 3 ? "font-bold text-foreground" : "text-muted-foreground")}>{item.name}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 shadow-none font-mono text-sm border-blue-200/20">
                                            {item.repairs}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                                        Sin datos.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// --- Spare Parts Usage ---
interface PartsUsageProps {
    data: {
        name: string;
        quantity: number;
        stockLocal?: number;
    }[];
}

export function PartsUsageTable({ data }: PartsUsageProps) {
    return (
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm ring-1 ring-white/10 dark:ring-white/5 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border-b border-border/50">
                <CardTitle className="text-purple-500 font-bold">⚙️ Repuestos Top</CardTitle>
                <CardDescription>Más utilizados en Taller</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[350px] overflow-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-md z-10">
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead>Repuesto</TableHead>
                                <TableHead className="text-right">Usos</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, i) => (
                                <TableRow key={i} className="border-border/50 hover:bg-muted/30">
                                    <TableCell className="font-medium text-xs md:text-sm">{item.name}</TableCell>
                                    <TableCell className="text-right font-bold text-foreground/80">{item.quantity}</TableCell>
                                    <TableCell className="text-right text-muted-foreground font-mono text-xs">{item.stockLocal ?? '-'}</TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                        Sin datos.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
