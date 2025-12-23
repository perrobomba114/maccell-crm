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

interface ReplenishmentProps {
    data: {
        product: string;
        branch: string;
        quantity: number;
    }[];
}

export function ReplenishmentTable({ data }: ReplenishmentProps) {
    return (
        <Card className="border border-zinc-800 bg-[#18181b] shadow-none">
            <CardHeader className="border-b border-zinc-800/50 pb-4">
                <CardTitle className="text-white text-lg font-bold">⚠️ Requerido Stock</CardTitle>
                <CardDescription className="text-zinc-500">Productos con stock crítico ({"<"} 3)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[350px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    <Table>
                        <TableHeader className="bg-zinc-900/50">
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <TableHead className="text-zinc-400">Producto</TableHead>
                                <TableHead className="text-zinc-400">Sucursal</TableHead>
                                <TableHead className="text-right text-zinc-400">Stock</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, i) => (
                                <TableRow key={i} className="border-zinc-800/50 hover:bg-zinc-800/30">
                                    <TableCell className="font-medium text-xs md:text-sm text-zinc-300">{item.product}</TableCell>
                                    <TableCell className="text-xs text-zinc-500">{item.branch}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="destructive" className="font-mono bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">
                                            {item.quantity}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-zinc-500 py-8 text-sm">
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
