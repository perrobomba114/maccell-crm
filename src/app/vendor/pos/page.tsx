import { getCurrentUser } from "@/actions/auth-actions";
import { redirect } from "next/navigation";
import { PosClient } from "./pos-client";

export const metadata = {
    title: "Punto de Venta - Maccell CRM",
    description: "Sistema de ventas y cobros.",
};

export default async function PosPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    // Allow Admin or Vendor
    if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        redirect("/login"); // or forbidden
    }

    if (!user.branch?.id) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive">Error de Configuración</h1>
                    <p>Tu usuario no tiene una sucursal asignada.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <PosClient
                vendorId={user.id}
                vendorName={user.name}
                branchId={user.branch.id}
                branchData={user.branch}
            />
        </div>
    );
}
