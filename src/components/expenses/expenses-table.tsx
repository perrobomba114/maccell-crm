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
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">Fecha</TableHead>
                            <TableHead className="text-center">Usuario</TableHead>
                            <TableHead className="text-center">Sucursal</TableHead>
                            <TableHead className="text-center">Descripción</TableHead>
                            <TableHead className="text-center">Monto</TableHead>
                            <TableHead className="text-center">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No hay gastos registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-medium">
                                                {format(new Date(expense.createdAt), "dd MMM yyyy", { locale: es })}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(expense.createdAt), "HH:mm", { locale: es })} hs
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 justify-center">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={getImgUrl(expense.user.imageUrl)} />
                                                <AvatarFallback>{expense.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{expense.user.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-sm text-muted-foreground">{expense.branch.name}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-sm">{expense.description}</span>
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-red-600 dark:text-red-400">
                                        - ${expense.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                onClick={() => setEditingExpense(expense)}
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
        </>
    );
}
