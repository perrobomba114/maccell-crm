import SalesClient from "./sales-client";
import { getCurrentUser } from "@/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function SalesPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== "VENDOR") redirect("/");

    return <SalesClient branchData={user.branch} />;
}
