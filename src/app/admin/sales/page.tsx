import { getCurrentUser } from "@/actions/auth-actions";
import { redirect } from "next/navigation";
import AdminSalesClient from "./sales-client";
import { Suspense } from "react";

export default async function AdminSalesPage() {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
        redirect("/login");
    }

    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando ventas...</div>}>
            <AdminSalesClient />
        </Suspense>
    );
}
