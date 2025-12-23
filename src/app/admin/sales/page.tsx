import { getCurrentUser } from "@/actions/auth-actions";
import { redirect } from "next/navigation";
import AdminSalesClient from "./sales-client";

export default async function AdminSalesPage() {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
        redirect("/login");
    }

    return <AdminSalesClient />;
}
