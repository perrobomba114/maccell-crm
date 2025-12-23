"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import { revalidatePath } from "next/cache";

export async function createExpense(data: {
    amount: number;
    description: string;
}) {
    const user = await getCurrentUser();

    // Validate User & Branch
    if (!user || !user.branch) {
        return { success: false, error: "Usuario no autorizado o sin sucursal asignada." };
    }

    if (!data.amount || data.amount <= 0) {
        return { success: false, error: "El monto debe ser mayor a 0." };
    }

    if (!data.description || data.description.trim().length < 3) {
        return { success: false, error: "Ingrese una descripción válida." };
    }

    try {
        await db.expense.create({
            data: {
                branchId: user.branch.id,
                userId: user.id,
                amount: data.amount,
                description: data.description,
            }
        });

        // Optionally update CashShift if we were tracking live balance there, 
        // but for now we just record the expense.

        revalidatePath("/vendor/pos");
        revalidatePath("/vendor/dashboard");

        return { success: true };

    } catch (error) {
        console.error("Error creating expense:", error);
        return { success: false, error: "Error al registrar el gasto." };
    }
}
