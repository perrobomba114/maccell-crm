
import { getActiveRepairsAction } from "@/lib/actions/repairs";
import { getUserData } from "@/actions/get-user";
import { ActiveRepairsTable } from "@/components/repairs/active-repairs-table";
import { redirect } from "next/navigation";

export default async function ActiveRepairsPage() {
    const user = await getUserData();

    if (!user || user.role !== "VENDOR") {
        redirect("/login");
    }

    if (!user.branch) {
        return <div>Error: Usuario sin sucursal asignada.</div>;
    }

    const repairs = await getActiveRepairsAction(user.branch.id);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Reparaciones Activas</h1>
            </div>

            <ActiveRepairsTable repairs={repairs} enableImageUpload={true} />
        </div>
    );
}
