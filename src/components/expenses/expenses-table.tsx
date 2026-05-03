"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Building2, Edit, ReceiptText, Trash2, UserRound } from "lucide-react";
import { deleteExpenseAction } from "@/actions/admin-expenses";
import { EditExpenseDialog } from "./edit-expense-dialog";
import { toast } from "sonner";
import { getImgUrl } from "@/lib/utils";
import type { AdminExpense } from "@/types/admin-expenses";

interface ExpensesTableProps {
    expenses: AdminExpense[];
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
});

export function ExpensesTable({ expenses }: ExpensesTableProps) {
    const [editingExpense, setEditingExpense] = useState<AdminExpense | null>(null);

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
            const result = await deleteExpenseAction(id);
            if (result.success) {
                toast.success("Gasto eliminado");
            } else {
                toast.error(result.error);
            }
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="hidden overflow-hidden rounded-lg border bg-card shadow-sm md:block">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[150px] pl-6">Fecha</TableHead>
                            <TableHead>Detalle</TableHead>
                            <TableHead className="w-[190px]">Registró</TableHead>
                            <TableHead className="w-[180px]">Sucursal</TableHead>
                            <TableHead className="w-[150px] text-right">Monto</TableHead>
                            <TableHead className="w-[110px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                                            <ReceiptText className="h-5 w-5" />
                                        </div>
                                        <p className="font-medium text-sm">No hay gastos registrados</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => (
                                <TableRow
                                    key={expense.id}
                                    className="group"
                                >
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold tabular-nums">
                                                {format(new Date(expense.createdAt), "dd MMM yyyy", { locale: es })}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {format(new Date(expense.createdAt), "HH:mm", { locale: es })} hs
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="max-w-[520px]">
                                            <p className="font-semibold leading-snug">{expense.description}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">ID {expense.id.slice(-6).toUpperCase()}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 border">
                                                <AvatarImage src={getImgUrl(expense.user.imageUrl)} />
                                                <AvatarFallback className="text-[10px]">{expense.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{expense.user.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <span className="inline-flex max-w-[160px] items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-bold">
                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="truncate">{expense.branch.name}</span>
                                            <span className="text-muted-foreground">{expense.branch.code}</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                        <span className="rounded-md bg-rose-50 px-2.5 py-1 font-black tabular-nums text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                            - {currencyFormatter.format(expense.amount)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 text-right">
                                        <div className="inline-flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                onClick={() => setEditingExpense(expense)}
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Editar gasto</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                onClick={() => handleDelete(expense.id)}
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Eliminar gasto</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="grid gap-3 md:hidden">
                {expenses.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                        No hay gastos registrados
                    </div>
                ) : expenses.map((expense) => (
                    <article key={expense.id} className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-bold leading-snug">{expense.description}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {format(new Date(expense.createdAt), "dd MMM yyyy · HH:mm 'hs'", { locale: es })}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-md bg-rose-50 px-2 py-1 font-black text-rose-700">
                                -{currencyFormatter.format(expense.amount)}
                            </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                <UserRound className="h-4 w-4 shrink-0" />
                                <span className="truncate">{expense.user.name}</span>
                            </div>
                            <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold">{expense.branch.name}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingExpense(expense)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Button>
                            <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(expense.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </Button>
                        </div>
                    </article>
                ))}
            </div>

            {editingExpense && (
                <EditExpenseDialog
                    isOpen={!!editingExpense}
                    onClose={() => setEditingExpense(null)}
                    expense={editingExpense}
                />
            )}
        </div>
    );
}
