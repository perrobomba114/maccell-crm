
import { CreateRepairForm } from "@/components/repairs/create-form";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";

export default async function VendorCreateRepairPage() {
    const user = await getUserData();

    if (!user) {
        redirect("/");
    }

    if (user.role !== "VENDOR") {
        // redirect("/admin/dashboard");
    }

    if (!user.branch) {
        return <div className="p-8 text-center text-muted-foreground">Usuario no asignado a una sucursal. Contacte al administrador.</div>;
    }

    // Removed the "unnecessary" header info as requested.
    // The user wants a clean, compact view.
    return (
        <div className="h-full w-full">
            <CreateRepairForm
                branchId={user.branch.id}
                userId={user.id}
                redirectPath="/vendor/repairs/active"
                hidePrice={true}
                hideParts={true}
                ticketPrefix={user.branch.ticketPrefix}
            />
        </div>
    );
}
