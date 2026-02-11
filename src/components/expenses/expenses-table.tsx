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
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteExpenseAction } from "@/actions/admin-expenses";
import { EditExpenseDialog } from "./edit-expense-dialog";
import { toast } from "sonner";
import { getImgUrl } from "@/lib/utils";

interface ExpensesTableProps {
    expenses: any[];
}

export function ExpensesTable({ expenses }: ExpensesTableProps) {
    const [editingExpense, setEditingExpense] = useState<any>(null);

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
        <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                        <TableRow className="hover:bg-transparent border-b border-zinc-100 dark:border-zinc-800">
                            <TableHead className="w-[180px] font-bold text-xs uppercase tracking-wider text-zinc-500 pl-6 h-12">Fecha</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 h-12">Detalle</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 h-12">Sucursal</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 text-right h-12">Monto</TableHead>
                            <TableHead className="w-[100px] font-bold text-xs uppercase tracking-wider text-zinc-500 text-center h-12">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                            <Trash2 className="h-5 w-5 text-zinc-400" />
                                        </div>
                                        <p className="font-medium text-sm">No hay gastos registrados</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => (
                                <TableRow
                                    key={expense.id}
                                    className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                >
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                                                {format(new Date(expense.createdAt), "dd MMM yyyy", { locale: es })}
                                            </span>
                                            <span className="text-xs text-zinc-400 font-medium">
                                                {format(new Date(expense.createdAt), "HH:mm", { locale: es })} hs
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {expense.description}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 border border-zinc-200">
                                                    <AvatarImage src={getImgUrl(expense.user.imageUrl)} />
                                                    <AvatarFallback className="text-[9px]">{expense.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-zinc-500">{expense.user.name}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                            {expense.branch.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                        <span className="font-bold text-red-600 dark:text-red-400 tabular-nums text-base">
                                            - ${expense.amount.toLocaleString()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                onClick={() => setEditingExpense(expense)}
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => handleDelete(expense.id)}
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
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
